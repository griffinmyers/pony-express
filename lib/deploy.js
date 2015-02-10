var _ = require('lodash');
var Q = require('q');
var util = require('util');
var rmdir = require('rimraf');
var config = root_require('config');
var build = require('./build');
var logger = require('./logger');
var Dropbox = require('./dropbox');
var Bucket = require('./bucket');
var store = new (require('./store'))(config.key_bucket);

function deploy(id) {

  var staging_dir = [config.source, id].join('-');
  var build_dir = [config.destination, id].join('-');

  var user = config.users[id];

  if(!user) {
    logger.error('Unknown User: ' + id + '.');
    return Q.reject('Unknown User: ' + id + '.');
  }

  return store.get(id).then(function(result) {
    logger.info(id, 'Credentials Found.');
    return new Dropbox(result.Body.toString()).save(staging_dir);
  }).then(function() {
    logger.info(id, 'Fetch Succeeded.');
    return build(config.root, staging_dir, build_dir);
  }).then(function() {
    logger.info(id, 'Build Succeeded.');
    return new Bucket(build_dir, user.bucket).push();
  }).then(function() {
    logger.info(id, 'Deploy Succeeded.')
    return Q.all([Q.nfcall(rmdir, staging_dir), Q.nfcall(rmdir, build_dir)]);
  }).then(function() {
    logger.info(id, 'Cleanup Succeeded.');
  }, function(reason) {
    logger.error('Deploy failed: %s', reason.stack || reason);
    throw reason;
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
