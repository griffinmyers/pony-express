var _ = require('lodash');
var logger = root_require('lib').logger;
var deploy = root_require('lib').deploy;

module.exports = {
  challenge: function(req, res) {
    res.send(req.query.challenge);
  },
  deploy: function(req, res) {
    var accounts = _.get(req, 'body.list_folder.accounts', []);

    if(accounts.length){
      logger.info('Deploying for accounts [', accounts.join(', '), ']');
      process.nextTick(_.partial(deploy, accounts));
      res.status(200).send('ok');
    }
    else {
      logger.error('No accounts provided.');
      res.status(500).send('No accounts provided.');
    }
  },
  deploy_sync: function(req, res) {
    deploy(req.body.id).then(function() {
      res.status(200).send('ok.');
    }, function() {
      res.status(500).send('Deploy Failed.');
    }).done();
  }
};
