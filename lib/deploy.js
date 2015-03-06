var _ = require('lodash');
var Q = require('q');
var util = require('util');
var path = require('path');
var config = root_require('config');
var build = require('./build');
var logger = require('./logger');
var Dropbox = require('./dropbox');
var Bucket = require('./bucket');
var store = new (require('./store'))(config.key_bucket);

function deploy(id) {

  var staging_dir = path.join(config.source, id.toString());
  var build_dir = path.join(config.destination, id.toString());

  var user = config.users[id];

  if(!user) {
    logger.error('Unknown User: ' + id + '.');
    return Q.reject('Unknown User: ' + id + '.');
  }

  return store.get(id).then(function(result) {
    logger.info(id, 'Credentials Found.');
    return new Dropbox(result.Body.toString(), staging_dir).sync();
  }).then(function() {
    logger.info(id, 'Fetch Succeeded.');
    return build(config.root, staging_dir, build_dir, user.middleware(staging_dir));
  }).then(function() {
    logger.info(id, 'Build Succeeded.');
    return new Bucket(build_dir, user.bucket).push();
  }).then(function() {
    logger.info(id, 'Deploy Succeeded.')
  }, function(reason) {
    logger.error('Deploy failed: %s', reason.stack);
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
