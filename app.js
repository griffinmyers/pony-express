var _ = require('lodash');
var express = require('express');
var morgan = require('morgan')
var logger = require('lib').logger;
var build = require('./build');

var app = express();
var port = process.env['PORT'] || 8080;

app.use(morgan('common', {stream: logger.stream}));

app.post('/build', function(req, res) {
  _.defer(function() { build().done(); });
  res.status(200).send('ok');
});

app.post('/build_sync', function(req, res) {
  build().then(function() {
    logger.info('Build succeded.')
    res.status(200).send('Ok.');
  }, function(reason) {
    logger.error('Build failed', reason);
    res.status(500).send('Build Failed.');
  }).done();
});

app.listen(port, function server() {
  logger.info('node server listening on', port);
});
