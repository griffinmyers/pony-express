var fs = require('fs');
var url = require('url');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var request = require('request');
var rmdir = require('rimraf');
var logger = require('./logger');

// # Dropbox
//
// ```javascript
// var dropbox = new Dropbox('remote_dir')
// dropbox.save('local_dir').then(console.log)
// ```

// ```bash
// export DROPBOX_ACCESS_KEY='iknewyouweretroublewhenyouwalkedin'
// ```
//
function Dropbox(folder) {
  this.folder = '/' + folder;
}

_.extend(Dropbox.prototype, {
  save: function save(destination) {
    //
    // ## save
    //
    // Saves the remote directory
    //
    return Q.nfcall(rmdir, destination)
      .then(Q.nbind(fs.mkdir, fs, destination))
      .then(_.bind(this.save_folder, this, destination));
  },
  save_folder: function save_folder(destination, folder) {
    //
    // ## save_folder
    //
    // Get a folder, and its files.
    //
    var self = this;

    return self.index(folder).then(function(index) {
      var folders = _.map(_.filter(index.contents, 'is_dir'), function(folder) {
        return Q.ninvoke(fs, 'mkdir', self.local_path(destination, folder.path))
          .then(_.bind(self.save_folder, self, destination, path.relative(self.folder, folder.path)))
      });

      var files = _.map(_.reject(index.contents, 'is_dir'), function(file) {
        return self.fetch_file(path.relative(self.folder, file.path))
          .then(Q.nbind(fs.writeFile, fs, self.local_path(destination, file.path)))
          .then(function() { return file.path; });
      });

      return Q.all(folders.concat(files)).then(_.flatten);
    });
  },
  fetch_file: function fetch_file(path) {
    //
    // ## fetch_file
    //
    // Well, get a file then.
    //
    return this.api_content_req(url_join('1/files/auto', this.folder, path));
  },
  index: function index(folder) {
    //
    // ## index
    //
    // Fetches an index of the remote folder.
    //
    return this.api_req(url_join('1/metadata/auto', this.folder, folder));
  },
  remote_path: function remote_path(remote_path) {
    //
    // ## remote_path
    //
    // get the remote path of a folder or file
    //
    return path.relative(this.folder, remote_path);
  },
  local_path: function local_path(local_dest, remote_path) {
    //
    // ## local_path
    //
    // get the local path to place a folder or file
    //
    return path.join(local_dest, this.remote_path(remote_path));
  },
  api_req: function(pathname) {
    //
    // ## api_req
    //
    // for requests to api.dropbox.com
    //
    return this.req(pathname, 'api.dropbox.com', {json: {}}).spread(function(body, headers) {
      if(_.has(body, 'error')) { throw new Error(body.error); }

      return body;
    });
  },
  api_content_req: function(pathname) {
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
        Authorization: 'Bearer ' + process.env['DROPBOX_ACCESS_KEY']
      }
    }, options)).spread(function(response, body) {
      return [body, response.headers];
    }, function(reason) {
      logger.error(reason.stack);
    });
  }
});

function url_join() {
  return _.compact(Array.prototype.slice.call(arguments)).join('/');
}

module.exports = Dropbox;
