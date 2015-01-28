var config = require('../config');
var build = require('../build');
var logger = require('./logger');
var bucket = new (require('./bucket'))(config.destination, config.bucket);
var util = require('util');

function deploy() {
  debugger;
  return build().then(function() {
    logger.info('Build Succeeded.');
    return bucket.sync();
  }).then(function() {
    logger.info('Deploy Succeeded.')
  }, function(reason) {
    logger.error('Deploy failed: %s', reason.stack || reason);
  });
}

module.exports = deploy;
