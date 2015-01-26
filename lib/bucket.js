var path = require('path');
var fs = require('fs');
var Q = require('q');
var _ = require('lodash');
var glob = require('glob');
var AWS = require('aws-sdk');
var mime = require('mime');
var logger = require('./logger');

// # Bucket
//
// A collection of utilites for interacting with an S3 Bucket. Credentials
// should be in the environment.
//
// var bucket = new Bucket('portfolio.com');
//
// bucket.sync('build').then(function(reason) {
//   console.log('This will be on my videotape');
// });
//
// ```bash
// export AWS_ACCESS_KEY_ID='AKID'
// export AWS_SECRET_ACCESS_KEY='SECRET'
// ```
//
function Bucket(bucket) {
  this.bucket = new AWS.S3({params: {Bucket: bucket}});
}

_.extend(Bucket.prototype, {
  sync: function sync(dir) {
    //
    // ## sync
    //
    // Sync accepts a `dir` path as input and syncs it remotely with your
    // Bucket bucket.
    //
    var self = this;

    return self.list().then(function(result) {
      return _.map(result.Contents, function(remote) {
        return path.join(dir, remote.Key);
      });
    }).then(function(remotes) {
      return Q.nfcall(glob, path.join(dir, '**', '*')).then(function(locals) {
        return [remotes, locals];
      })
    }).spread(function(remotes, locals) {
      var upload = _(locals)
        .filter(path.extname)
        .map(_.partial(_.bind(self.upload, self), dir))
        .value();

      var del = self.del(dir, _.difference(remotes, locals));

      return Q.all(upload.concat(del));
    })
  },
  upload: function upload(dir, file) {
    //
    // ## upload
    //
    // Upload a file.
    //
    return Q.ninvoke(this.bucket, 'upload', {
      Key: path.relative(dir, file),
      Body: fs.createReadStream(file),
      ContentType: mime.lookup(file)
    });
  },
  del: function del(dir, files) {
    //
    // ## del
    //
    // Delete a file.
    //
    if(!files.length) {
      return Q('Nothing to delete');
    }

    return Q.ninvoke(this.bucket, 'deleteObjects', {
      Delete: {
        Objects: _.map(files, function(file) { return {Key: path.relative(dir, file)} })
      }
    });
  },
  list: function list() {
    //
    // ## list
    //
    // List the contents of a bucket.
    //
    return Q.ninvoke(this.bucket, 'listObjects');
  },
});

module.exports = Bucket;
