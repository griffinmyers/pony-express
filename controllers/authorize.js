var url = require('url')
var request = require('request');
var Q = require('q');
var config = root_require('config');
var logger = root_require('lib').logger;
var store = new (root_require('lib').Store)(config.key_bucket, config.s3_origin);

module.exports = {
  authorize: function(req, res) {
    res.redirect(url.format({
      protocol: 'https',
      hostname: 'dropbox.com',
      pathname: '/oauth2/authorize',
      query: {
        client_id: process.env.DROPBOX_APP_KEY,
        response_type: 'code',
        redirect_uri: config.redirect_uri
      }
    }));
  },
  redirect: function(req, res) {
    Q.nfcall(request, {
      method: 'POST',
      url: `${config.dropbox_api_origin}/oauth2/token`,
      form: {
        client_id: process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
        code: req.query.code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirect_uri
      }
    }).spread(function(response, body) {
      var result = JSON.parse(body);

      if(response.statusCode !== 200) {
        throw new Error([result.error, result.error_description].join(' '));
      }
      else {
        return result;
      }
    }).then(function(result) {
      return store.put(result.uid, result.access_token).then(function() {
        return result.uid
      })
    }).then(function(uid){
      logger.info('Authorization Succeeded, UID', uid);
      res.render('content', {content: 'Ok Computer'});
    }, function(reason) {
      logger.error('Authorization Failed', reason.message);
      res.status(500).render('content', {content: 'Authorization Failed'});
    }).done();
  }
};
