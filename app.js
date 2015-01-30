var crypto = require('crypto');
var app = require('express')();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var logger = require('./lib').logger;
var config = require('./config');
var deploy = require('./lib').deploy(config.dropbox, config.source, config.destination, config.bucket);

app.use(morgan('common', {stream: logger.stream}));

app.get('/deploy', function(req, res) {
  logger.info('Dropbox Webhook challenge "%s" received & echoed.', req.query.challenge);
  res.send(req.query.challenge);
});

app.post('/deploy', bodyParser.raw({type: '*'}), function(req, res) {
  logger.info('Webhook received with', req.body);

  var signature = req.header('X-Dropbox-Signature');
  logger.info('Signature', signature);
  var hmac = crypto.createHmac('sha256', process.env.DROPBOX_SECRET).update(req.body);
  logger.info('Hmac', hmac);

  if(!signature || signature !== hmac.digest('hex')) {
    logger.error('Invalid Signature.');
    res.status(403).end();
  }
  else {
    process.nextTick(deploy);
    res.send(200).send('ok');
  }
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
