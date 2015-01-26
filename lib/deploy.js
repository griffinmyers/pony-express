var config = require('../config');
var build = require('../build');
var logger = require('./logger');
var bucket = new (require('./bucket'))(config.bucket);

function deploy() {
  return build().then(function() {
    logger.info('Build Succeeded.');
    return bucket.sync(config.destination);
  }).then(function() {
    logger.info('Deploy Succeeded.')
  });
}

module.exports = deploy;
