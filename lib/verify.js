var crypto = require('crypto');
var logger = require('./logger');


function verify(req, res, buf, encoding) {
  //
  // ## verify
  //
  // Ensure we've gotten a legitimate request from Dropbox.
  //
  var signature = req.header('X-Dropbox-Signature');

  if(!signature) {
    return;
  }

  logger.info('Signature', signature);
  var hmac = crypto.createHmac('sha256', 'hey' /*process.env.DROPBOX_SECRET*/).update(buf);
  logger.info('Hmac', hmac.digest('hex'));

  if(!signature || signature !== hmac.digest('hex')) {
    var error = new Error('Invalid Signature');
    error.status = 403;
    throw error;
  }
}

module.exports = verify;
