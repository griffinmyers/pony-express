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
  this.folder = folder;
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
  save_folder: function save_folder(destination, subfolder) {
    //
    // ## save_folder
    //
    // Get a folder, and its files.
    //
    var self = this;
    subfolder =  subfolder || '';

    return self.index(subfolder).then(function(index) {
      var remote_path = index.path;
      var remotes = index.contents;

      var folders = _.map(_.filter(remotes, 'is_dir'), function(folder) {
        var sub = url_join(subfolder, path.relative(remote_path, folder.path));

        return Q.ninvoke(fs, 'mkdir', self.local_path(destination, folder.path))
          .then(_.bind(self.save_folder, self, destination, sub))
      });

      var files = _.map(_.reject(remotes, 'is_dir'), function(file) {
        return self.fetch_file(file.path)
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
    return this.req(url_join('1/files/auto', path.slice(1)), 'api-content.dropbox.com').spread(function(body, headers) {
      return body;
    });
  },
  index: function index(subfolder) {
    //
    // ## index
    //
    // Fetches an index of the remote folder.
    //
    subfolder = subfolder || '';

    return this.req(url_join('1/metadata/auto', this.folder, subfolder)).spread(function(body, headers) {
      return body;
    });
  },
  local_path: function local_path(local_dest, remote_path) {
    //
    // ## local_path
    //
    // get the local path to place a folder or file
    //
    return path.join(local_dest, path.relative(this.folder, remote_path.slice(1)))
  },
  req: function req(pathname, hostname) {
    //
    // ## req
    //
    // Make a network request
    //
    return Q.nfcall(request, {
      url: url.format({
        protocol: 'https',
        hostname: hostname || 'api.dropbox.com',
        pathname: pathname,
      }),
      encoding: null,
      headers: {
        Authorization: 'Bearer ' + process.env['DROPBOX_ACCESS_KEY']
      }
    }).spread(function(response, body) {
      if(_.contains(['text/javascript', 'application/json'], response.headers['content-type'])) {
        body = JSON.parse(body);
        if(_.has(body, 'error')) {
          throw new Error(body.error);
        }
      }

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
