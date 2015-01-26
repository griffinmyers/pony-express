var _ = require('lodash');
var express = require('express');
var morgan = require('morgan')
var logger = require('./lib').logger;
var deploy = require('./lib').deploy;

var app = express();
var port = process.env['PORT'] || 8080;

app.use(morgan('common', {stream: logger.stream}));

app.post('/deploy', function(req, res) {
  _.defer(function() { deploy().done(); });
  res.status(200).send('ok');
});

app.post('/deploy_sync', function(req, res) {
  deploy().then(function() {
    res.status(200).send('Ok.');
  }, function(reason) {
    logger.error('Deploy failed', reason);
    res.status(500).send('Build Failed.');
  }).done();
});

app.listen(port, function server() {
  logger.info('node server listening on', port);
});
