var app = require('express')();
var morgan = require('morgan')
var logger = require('./lib').logger;
var config = require('./config');
var deploy = require('./lib').deploy(config.dropbox, config.source, config.destination, config.bucket);

app.use(morgan('common', {stream: logger.stream}));

app.post('/deploy', function(req, res) {
  process.nextTick(deploy);
  res.status(200).send('ok');
});

app.post('/deploy_sync', function(req, res) {
  deploy().then(function() {
    res.status(200).send('Ok.');
  }, function(reason) {
    res.status(500).send('Deploy Failed.');
  }).done();
});

app.listen(config.port, function server() {
  logger.info('node server listening on', config.port);
});
