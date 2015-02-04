var _ = require('lodash');
var Q = require('q');
var util = require('util');
var logger = require('./logger');
var Dropbox = require('./dropbox');
var build = require('../build');
var config = require('../config');
var Bucket = require('./bucket');
var rmdir = require('rimraf');
var uuid = require('node-uuid');

function deploy(dropbox_id) {

  var id = uuid.v4();

  var staging_dir = [config.source, id].join('-');
  var build_dir = [config.destination, id].join('-');

  var user = config.users[dropbox_id];

  if(!user) {
    logger.error('Unknown User: ' + dropbox_id + '.');
    return Q.reject('Unknown User: ' + dropbox_id + '.');
  }

  var dropbox = new Dropbox(user.dropbox);
  var bucket = new Bucket(build_dir, user.bucket);

  return dropbox.save(staging_dir).then(function() {
    logger.info(id, 'Fetch Succeeded.');
    return build(staging_dir, build_dir);
  }).then(function() {
    logger.info(id, 'Build Succeeded.');
    return bucket.push();
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

module.exports = function(dropbox_ids) {
  if(_.isArray(dropbox_ids)) {
    return Q.all(_.map(dropbox_ids, function(id) {
      return deploy(id);
    }));
  }
  else {
    return deploy(dropbox_ids);
  }
}
