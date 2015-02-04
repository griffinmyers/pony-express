var _ = require('lodash');
var app = require('express')();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require('./config');
var logger = require('./lib').logger;
var verify = require('./lib').verify;
var deploy = require('./lib').deploy;

app.use(morgan('common', {stream: logger.stream}));

app.get('/deploy', function(req, res) {
  res.send(req.query.challenge);
});

app.post('/deploy', bodyParser.json({verify: verify}), function(req, res) {
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
});

app.post('/deploy_sync', bodyParser.json(), function(req, res) {
  deploy(req.body.id).then(function() {
    res.status(200).send('ok.');
  }, function(reason) {
    res.status(500).send('Deploy Failed.');
  }).done();
});

app.listen(config.port, function server() {
  logger.info('node server listening on', config.port);
});
