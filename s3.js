var path = require('path');
var fs = require('fs');
var Q = require('q');
var _ = require('lodash');
var glob = require('glob');
var AWS = require('aws-sdk');
var mime = require('mime');
var logger = require('./logger');

aws_config = {logger: logger.stream};

// # S3Bucket
//
// A collection of utilites for interacting with S3Bucket. Credentials should be in
// the environment.
//
// var bucket = new S3Bucket('portfolio.com');
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
function S3Bucket(bucket) {
  this.bucket = new AWS.S3(_.extend({}, aws_config, {params: {Bucket: bucket}}));
}

_.extend(S3Bucket.prototype, {
  sync: function sync(dir) {
    //
    // ## sync
    //
    // Sync accepts a `dir` path as input and syncs it remotely with your
    // S3Bucket bucket.
    //
    var self = this;

    return Q.nfcall(glob, path.join(dir, '**', '*')).then(function(files) {
      return Q.all(_(files)
        .filter(path.extname)
        .map(_.partial(_.bind(self.upload, self), dir))
        .value());
    });
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
  }
});

module.exports = S3Bucket;
