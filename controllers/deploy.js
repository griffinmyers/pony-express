var _ = require('lodash');
var logger = root_require('lib').logger;
var deploy = root_require('lib').deploy;

module.exports = {
  challenge: function(req, res) {
    res.send(req.query.challenge);
  },
  deploy: function(req, res) {
    var users = req.body && req.body.delta && req.body.delta.users || [];

    if(users.length){
      logger.info('Deploying for users [', users.join(', '), ']');
      process.nextTick(_.partial(deploy, users));
      res.status(200).send('ok');
    }
    else {
      logger.error('No users provided.');
      res.status(500).send('No users provided.');
    }
  },
  deploy_sync: function(req, res) {
    deploy(req.body.id).then(function() {
      res.status(200).send('ok.');
    }, function(reason) {
      res.status(500).send('Deploy Failed.');
    }).done();
  }
};
