var fs = require('fs');
var url = require('url');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var request = require('request');
var rmdir = require('rimraf');
var mkdirp = require('mkdirp');
var logger = require('./logger');

// # Dropbox
//
// ```javascript
// var dropbox = new Dropbox('ACCESS_KEY', 'source/123');
//
// dropbox.sync().then(console.log)
// ```
//
var TOKEN_FILE = '.pony-token'

function Dropbox(access_key, destination) {
  this.access_key = access_key;
  this.destination = destination;
  this.cursor_file = path.join(this.destination, TOKEN_FILE);
}

_.extend(Dropbox.prototype, {
  //
  // ## sync
  //
  // This uses the dropbox api to keep `this.destination` in sync with
  // a remote directory.
  //
  // Because it relies on a delta api, it persists a cursor along with the
  // local directory. If this cursor isn't present, it will rebuild the local
  // copy. If it is present, it will call /delta with it and perform the
  // required operations to sync state between the two directories.
  //
  sync: function sync() {
    return this.cursor()
      .then(this.maybe_reset.bind(this))
      .then(this.list_folder.bind(this))
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
    var self = this;

    return Q.nfcall(mkdirp, self.destination).then(function() {
      return Q.ninvoke(fs, 'readFile', self.cursor_file).then(function(result) {
        return result.toString();
      });
    }).catch(function() {
      return null;
    });
  },
  save_cursor: function save_cursor(cursor) {
    //
    // ## save_cursor
    //
    // This will save a cursor, overwriting any previously exising one.
    //
    return Q.ninvoke(fs, 'writeFile', this.cursor_file, cursor).then(function() {
      return cursor;
    });
  },
  delete_cursor: function delete_cursor() {
    //
    // ## delete_cursor
    //
    // This will delete the local cursor. Nice for recovering from an error.
    //
    return Q.nfcall(rmdir, this.cursor_file);
  },
  maybe_reset: function maybe_reset(cursor) {
    //
    // ## maybe_reset
    //
    // This will potentially reset the local directory if no cursor was found
    // to perform a delta sync.
    //
    if(cursor) {
      return cursor;
    }
    else {
      return this.reset().then(function() { return null; });
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
    // It takes care to first handle all creating and deleting of folders and
    // files before syncing file contents. This way there aren't any async
    // race conditions and the directory stucture is nicely set up for
    // writing files.
    //
    var self = this;

    var partitions = _.groupBy(result.entries, '.tag');

    var folders = _.map(partitions['folder'] || [], self.sync_folder.bind(self));
    var deletes = _.map(partitions['deleted'] || [], self.sync_delete.bind(self));
    var files = _.map(partitions['file'] || [], self.sync_file.bind(self));


    return Q.all(folders.concat(deletes)).then(function() {
      return Q.all(files);
    }).then(function() { return result.cursor; });
  },
  sync_folder: function sync_folder(entry) {
    //
    // ## sync_folder
    //
    // ...
    //
    var local_path = path.join(this.destination, entry.path_lower);

    logger.info('Creating', local_path);
    return Q.nfcall(rmdir, local_path).then(Q.nfbind(mkdirp, local_path));
  },
  sync_delete: function sync_delete(entry) {
    //
    // ## sync_delete
    //
    // ...
    //
    var local_path = path.join(this.destination, entry.path_lower);

    logger.info('Deleting', local_path)
    return Q.nfcall(rmdir, local_path);
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
    var remote_path = entry.path_lower;
    var local_path = path.join(this.destination, remote_path);

    logger.info('Syncing', local_path)
    return this.fetch_file(remote_path).then(Q.nbind(fs.writeFile, fs, local_path));
  },
  list_folder: function list_folder(cursor) {
    //
    // ## list_folder
    //
    // This will recursively call the /files/list_folder api until the
    // `.has_more` property of the response returns false, concating subsequent
    // entiries as it needs.
    //
    // If the original invokation passed a truthy-cursor, this will attempt to
    // reset and sync from scratch in the event of a failure.
    //
    var self = this;

    return self.list_folder_req(cursor).then(function(result) {
      if(result.has_more) {
        return self.list_folder(result.cursor).then(function(next_result) {
          return _.extend({}, next_result, {
            entries: result.entries.concat(next_result.entries)
          });
        });
      }

      return result;
    }, function(reason) {
      if (cursor) {
        return self.reset().then(self.list_folder.bind(self));
      }
      else {
        throw reason;
      }
    });
  },
  list_folder_req: function list_folder_req(cursor) {
    //
    // # list_folder_req
    //
    // ...
    //
    var endpoint;

    if(cursor) {
      endpoint = this.api_req('/2/files/list_folder/continue', {
        method: 'POST',
        json: { cursor: cursor }
      })
    }
    else {
      endpoint = this.api_req('/2/files/list_folder', {
        method: 'POST',
        json: { path: '', recursive: true }
      });
    }

    return endpoint.spread(function(body, headers) {
      if(headers['content-type'] === 'application/json') {
        if(_.has(body, 'error')) {
          throw new Error(body.error['.tag']);
        }

        return body
      }
      else {
        throw new Error(body);
      }
    });
  },
  fetch_file: function fetch_file(pathname) {
    //
    // ## fetch_file
    //
    // Well, get a file then.
    //
    return this.api_content_req('/2/files/download', pathname);
  },
  api_req: function api_req(pathname, options) {
    //
    // ## api_req
    //
    // for requests to api.dropboxapi.com
    //
    return this.req(pathname, 'api.dropboxapi.com', options);
  },
  api_content_req: function api_content_req(pathname, file_pathname) {
    //
    // ## api_content_req
    //
    // for requests to content.dropboxapi.com
    //
    return this.req(pathname, 'content.dropboxapi.com', {
      encoding: null,
      headers: {'Dropbox-API-Arg': JSON.stringify({path: file_pathname})}
    }).spread(function(body, headers) {
      if(headers['content-type'] === 'application/json') {
        var parsed_body = JSON.parse(body);
        if(_.has(parsed_body, 'error')) {
          throw new Error([parsed_body.error, pathname].join(' '));
        }
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
    return Q.nfcall(request, _.defaultsDeep(options, {
      url: url.format({
        protocol: 'https',
        hostname: hostname,
        pathname: pathname
      }),
      headers: {
        Authorization: 'Bearer ' + this.access_key
      }
    })).spread(function(response, body) {

      if(response.statusCode !== 200) {
        throw new Error('bad response [' + response.statusCode + '] ' + JSON.stringify(body));
      }

      return [body, response.headers];
    }).catch(function(reason) {
      logger.error(reason.stack);
      throw reason;
    });
  }
});

module.exports = Dropbox;
