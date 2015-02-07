var fs = require('fs');
var url = require('url');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var request = require('request');
var rmdir = require('rimraf');
var logger = require('./logger');
var store = require('./store');

// # Dropbox
//
// ```bash
// export DROPBOX_ACCESS_KEY='iknewyouweretroublewhenyouwalkedin'
// ```
//
// ```javascript
// var dropbox = new Dropbox('12kjasdkljsad');
//
// dropbox.save('local_dir').then(console.log)
// ```
//
function Dropbox(access_key) {
  this.access_key = access_key;
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
        return Q.ninvoke(fs, 'mkdir', path.join(destination, folder.path))
          .then(_.bind(self.save_folder, self, destination, folder.path))
      });

      var files = _.map(_.reject(index.contents, 'is_dir'), function(file) {
        return self.fetch_file(file.path)
          .then(Q.nbind(fs.writeFile, fs, path.join(destination, file.path)))
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
    return this.api_content_req(['1/files/auto', path].join('/'));
  },
  index: function index(folder) {
    //
    // ## index
    //
    // Fetches an index of the remote folder.
    //
    return this.api_req(['1/metadata/auto', folder].join('/'));
  },
  api_req: function(pathname) {
    //
    // ## api_req
    //
    // for requests to api.dropbox.com
    //
    return this.req(pathname, 'api.dropbox.com', {json: {}}).spread(function(body, headers) {
      if(_.has(body, 'error')) { throw new Error([body.error, pathname].join(' ')); }
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
