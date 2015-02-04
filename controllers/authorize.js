var url = require('url')
var request = require('request');
var Q = require('Q');
var logger = root_require('lib').logger;

module.exports = {
  authorize: function(req, res) {
    res.redirect(url.format({
      protocol: 'https',
      hostname: 'dropbox.com',
      pathname: '/1/oauth2/authorize',
      query: {
        client_id: process.env.DROPBOX_APP_KEY,
        response_type: 'code',
        redirect_uri: 'http://localhost:3000/authorize/redirect'
      }
    }));
  },
  redirect: function(req, res) {
    Q.nfcall(request, {
      method: 'POST',
      url: url.format({
        protocol: 'https',
        hostname: 'api.dropbox.com',
        pathname: '/1/oauth2/token'
      }),
      form: {
        client_id: process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
        code: req.query.code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/authorize/redirect'
      }
    }).spread(function(response, body) {
      var result = JSON.parse(body);

      if(response.statusCode !== 200) {
        throw new Error([result.error, result.error_description].join(' '));
      }
      else {
        return result;
      }
    }).then(function(result){
      // save to s3 => {result.uid: result.access_token}
      logger.info('Sucessfully authorized ', result.uid);
      res.send('ok computer')
    }, function(reason) {
      logger.error('Authorization failed', reason.message);
      res.send('borked')
    }).done();
  }
};