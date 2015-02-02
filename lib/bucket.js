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
// ```javascript
// var bucket = new Bucket('build' 'portfolio.com');
//
// The first param is the local file that represents what's going to be
// in your bucket. The second param is the actual bucket name.
//
// bucket.push('build').then(function(reason) {
//   console.log('This will be on my videotape');
// });
// ```
//
// ```bash
// export AWS_ACCESS_KEY_ID='AKID'
// export AWS_SECRET_ACCESS_KEY='SECRET'
// ```
//
function Bucket(local_bucket, bucket) {
  this.local_bucket = local_bucket;
  this.bucket = new AWS.S3({params: {Bucket: bucket}, apiVersion: '2006-03-01'});
}

_.extend(Bucket.prototype, {
  push: function push() {
    //
    // ## push
    //
    var self = this;

    return self.list().then(function(result) {
      return _.map(result.Contents, function(remote) {
        return path.join(self.local_bucket, remote.Key);
      });
    }).then(function(remotes) {
      return Q.nfcall(glob, path.join(self.local_bucket, '**', '*')).then(function(locals) {
        return [remotes, locals];
      })
    }).spread(function(remotes, locals) {
      var upload = _.map(_.filter(locals, path.extname), _.bind(self.upload, self));
      var del = self.del(_.difference(remotes, locals));

      return Q.all(upload.concat(del));
    })
  },
  upload: function upload(file) {
    //
    // ## upload
    //
    // Upload a file.
    //
    var self = this;

    return Q.ninvoke(this.bucket, 'upload', {
      Key: path.relative(self.local_bucket, file),
      Body: fs.createReadStream(file),
      ContentType: mime.lookup(file)
    });
  },
  del: function del(files) {
    //
    // ## del
    //
    // Delete a file.
    //
    var self = this;

    if(!files.length) {
      return Q('Nothing to delete');
    }

    return Q.ninvoke(this.bucket, 'deleteObjects', {
      Delete: {
        Objects: _.map(files, function(file) { return {Key: path.relative(self.local_bucket, file)} })
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
