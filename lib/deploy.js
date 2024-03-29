var _ = require('lodash');
var Q = require('q');
var path = require('path');
var config = root_require('config');
var build = require('./build');
var logger = require('./logger');
var Dropbox = require('./dropbox');
var ErrorReporter = require('./error_reporter');
var Bucket = require('./bucket');
var store = new (require('./store'))(config.key_bucket, config.s3_origin);

function deploy(id) {

  if(!id) {
    logger.error('No user passed.');
    return Q.reject('No user passed.');
  }

  var staging_dir = path.join(config.source, id.toString());
  var build_dir = path.join(config.destination, id.toString());

  var user = config.users[id];

  if(!user) {
    logger.error('Unknown User: ' + id + '.');
    return Q.reject('Unknown User: ' + id + '.');
  }

  var bucket_name = user.bucket;
  var bucket = new Bucket(build_dir, bucket_name, config.s3_origin);

  return store.get(id).then(function(result) {
    logger.info(bucket_name, 'Credentials Found.');
    return new Dropbox(result, staging_dir, config.dropbox_api_origin, config.dropbox_content_origin, bucket_name).sync();
  }).then(function() {
    logger.info(bucket_name, 'Fetch Succeeded.');
    return build(config.root, staging_dir, build_dir, user.middleware(staging_dir));
  }).then(function() {
    logger.info(bucket_name, 'Build Succeeded.');
    return bucket.push();
  }).then(function() {
    logger.info(bucket_name, 'Deploy Succeeded.')
    return bucket.del('_error/index.html');
  }, function(reason) {
    return new ErrorReporter(bucket).set(reason.stack).catch(function(r) {
      logger.error(bucket_name, 'Problem pushing error: %s', r.stack);
    }).fin(function() {
      logger.error(bucket_name, 'Deploy failed: %s', reason.stack);
    });
  });
}

module.exports = function(ids) {
  if(_.isArray(ids)) {
    return Q.all(_.map(ids, function(id) {
      return deploy(id);
    }));
  }
  else {
    return deploy(ids);
  }
}
