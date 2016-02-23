var crypto = require('crypto');

function verify(req, res, buf, encoding) {
  //
  // ## verify
  //
  // Ensure we've gotten a legitimate request from Dropbox.
  //
  var signature = req.header('X-Dropbox-Signature');

  var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

  if(!signature || signature !== hmac.digest('hex')) {
    var error = new Error('Invalid Signature');
    error.status = 403;
    throw error;
  }
}

module.exports = verify;
