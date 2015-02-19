var fs = require('fs');
var url = require('url');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var request = require('request');
var rmdir = require('rimraf');
var mkdirp = require('mkdirp');
var logger = require('./logger');
var store = require('./store');

// # Dropbox
//
// ```javascript
// var dropbox = new Dropbox('ACCESS_KEY', 'source/123');
//
// dropbox.sync().then(console.log)
// ```
//
function Dropbox(access_key, destination) {
  this.access_key = access_key;
  this.destination = destination;
  this.cursor_file = path.join(this.destination, '.ponyexpress');
}

_.extend(Dropbox.prototype, {
  //
  // ## sync
  //
  // This uses the dropbox /delta api to keep `this.destination` in sync with
  // a remote directory.
  //
  // Because it relies on the /delta api, it persists a cursor along with the
  // local directory. If this cursor isn't present, it will rebuild the local
  // copy. If it is present, it will call /delta with it and perform the
  // required operations to sync state between the two directories.
  //
  sync: function sync() {
    return this.cursor()
      .then(this.delta.bind(this))
      .then(this.maybe_reset.bind(this))
      .then(this.sync_entries.bind(this))
      .then(this.save_cursor.bind(this), function(reason) {
        return this.delete_cursor().then(function() { throw reason; });
      }.bind(this));
  },
  cursor: function cursor() {
    //
    // ## cursor
    //
    // This will return either a string of the cursor or null if one wasn't
    // found.
    //
    return Q.nfcall(mkdirp, this.destination).then(function() {
      return Q.ninvoke(fs, 'readFile', this.cursor_file).then(function(result) {
        return result.toString();
      });
    }.bind(this)).catch(function(reason) {
      return null;
    });
  },
  save_cursor: function save_cursor(cursor) {
    //
    // ## save_cursor
    //
    // This will save a cursor, overwriting any previously exising one.
    //
    return Q.ninvoke(fs, 'writeFile', this.cursor_file, cursor);
  },
  delete_cursor: function delete_cursor() {
    //
    // ## delete_cursor
    //
    // This will delete the local cursor. Nice for recovering from an error.
    //
    return Q.nfcall(rmdir, this.cursor_file);
  },
  maybe_reset: function maybe_reset(result) {
    //
    // ## maybe_reset
    //
    // This will potentially reset the local directory, if instructed by the
    // /delta api.
    //
    if(result.reset) {
      return this.reset().then(function() { return result; });
    }
    else {
      return result;
    }
  },
  reset: function reset() {
    //
    // ## reset
    //
    // This will reset a local directory.
    //
    return Q.nfcall(rmdir, this.destination)
      .then(Q.nbind(fs.mkdir, fs, this.destination))
  },
  sync_entries: function sync_entries(result) {
    //
    // ## sync_entries
    //
    // This will take the result from the /delta and sync all entries returned.
    //
    // It takes care to first handle all creating and deleting of folers and
    // files before syncing file contents. This way there aren't any async
    // race conditions and the directory stucture is nicely set up for
    // writing files.
    //
    var folder_or_delete = _.groupBy(result.entries, function(entry) {
      return _.isNull(entry[1]) || entry[1].is_dir;
    });

    return Q.all(_.map(folder_or_delete[true], this.sync_folder_or_delete.bind(this)))
      .then(Q.all(_.map(folder_or_delete[false], this.sync_file.bind(this))))
      .then(function() { return result.cursor; });
  },
  sync_folder_or_delete: function sync_folder_or_delete(entry) {
    //
    // ## sync_folder_or_delete
    //
    // This will either delete a folder or file (metadata is null) or
    // create a new directory, ensuring any children are eliminated on new
    // directory creation.
    //
    var local_path = path.join(this.destination, entry[0]);
    var metadata = entry[1];

    if(metadata === null) {
      logger.info('Deleting', local_path)
      return Q.nfcall(rmdir, local_path);
    }
    else {
      logger.info('Creating', local_path)
      return Q.nfcall(rmdir, local_path).then(Q.nfcall(mkdirp, local_path));
    }
  },
  sync_file: function sync_file(entry) {
    //
    // ## sync_file
    //
    // This will take an entry from the dropbox /delta endpoint and download
    // it locally.
    //
    // It will simply pull down the new file and overwrite any existing one
    // locally.
    //
    var remote_path = entry[0];
    var local_path = path.join(this.destination, remote_path);

    logger.info('Syncing', local_path)
    return this.fetch_file(remote_path).then(Q.nbind(fs.writeFile, fs, local_path));
  },
  delta: function delta(cursor) {
    //
    // ## delta
    //
    // This will recursively call the /delta api until the `.has_more` property
    // of the response returns false, concating subsequent entiries as it needs.
    //
    return this.delta_req(cursor).then(function(result) {
      if(result.has_more) {
        return this.delta(cursor).then(function(all_result) {
          result.entries = result.entries.concat(all_result.entries);
          return result;
        });
      }
      else {
        return result;
      }
    }.bind(this));
  },
  delta_req: function delta_req(cursor) {
    //
    // ## delta_req
    //
    // This will make an API call to /delta with the provided cursor.
    //
    // Parameters are FORM encoded (thanks dropbox for the sparse documentation)
    // and results are JSON, returned as a native JS object.
    //
    return this.api_req('1/delta', {
      method: 'POST',
      form: cursor ? {cursor: cursor} : {}
    }).then(function(body) {
      var result = JSON.parse(body);
      if(_.has(result, 'error')) { throw new Error(result.error); }
      return result;
    });
  },
  fetch_file: function fetch_file(path) {
    //
    // ## fetch_file
    //
    // Well, get a file then.
    //
    return this.api_content_req(['1/files/auto', path].join('/'));
  },
  api_req: function api_req(pathname, options) {
    //
    // ## api_req
    //
    // for requests to api.dropbox.com
    //
    return this.req(pathname, 'api.dropbox.com', options).spread(function(body, headers) {
      return body;
    });
  },
  api_content_req: function api_content_req(pathname) {
    //
    // ## api_content_req
    //
    // for requests to api-content.dropbox.com
    //
    return this.req(pathname, 'api-content.dropbox.com', {
      encoding: null
    }).spread(function(body, headers) {
      if(headers['content-type'] === 'application/json') {
        parsed_body = JSON.parse(body.toString('utf8'));
        if(_.has(parsed_body, 'error')) { throw new Error([parsed_body.error, pathname].join(' ')); }
      }

      return body;
    });
  },
  req: function req(pathname, hostname, options) {
    //
    // ## req
    //
    // Make a network request
    //
    return Q.nfcall(request, _.extend({
      url: url.format({
        protocol: 'https',
        hostname: hostname,
        pathname: pathname,
      }),
      headers: {
        Authorization: 'Bearer ' + this.access_key
      }
    }, options)).spread(function(response, body) {
      return [body, response.headers];
    }, function(reason) {
      logger.error(reason.stack);
    });
  }
});

module.exports = Dropbox;
