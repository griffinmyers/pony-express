var util = require('util');
var logger = require('./logger');
var Dropbox = require('./dropbox');
var build = require('../build');
var Bucket =  require('./bucket');

function deploy(dropbox_folder, staging_dir, build_dir, bucket_name) {
  var dropbox = new Dropbox(dropbox_folder);
  var bucket = new Bucket(build_dir, bucket_name);

  return dropbox.save(staging_dir).then(function() {
    logger.info('Fetch Succeeded.');
    return build();
  }).then(function() {
    logger.info('Build Succeeded.');
    return bucket.push();
  }).then(function() {
    logger.info('Deploy Succeeded.')
  }, function(reason) {
    logger.error('Deploy failed: %s', reason.stack || reason);
  });
}

module.exports = function(dropbox_folder, staging_dir, build_dir, bucket_name) {
  return function() {
    return deploy(dropbox_folder, staging_dir, build_dir, bucket_name);
  }
}
