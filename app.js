var app = require('express')();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var logger = require('./lib').logger;
var verify = require('./lib').verify;
var config = require('./config');
var deploy = require('./lib').deploy(config.dropbox, config.source, config.destination, config.bucket);

app.use(morgan('common', {stream: logger.stream}));

app.get('/deploy', function(req, res) {
  res.send(req.query.challenge);
});

app.post('/deploy', bodyParser.json({verify: verify}), function(req, res) {
  logger.info('Webhook received with', req.body);
  process.nextTick(deploy);
  res.status(200).send('ok');
});

app.post('/deploy_sync', function(req, res) {
  deploy().then(function() {
    res.status(200).send('ok.');
  }, function(reason) {
    res.status(500).send('Deploy Failed.');
  }).done();
});

app.listen(config.port, function server() {
  logger.info('node server listening on', config.port);
});
