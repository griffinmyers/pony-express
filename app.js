var express = require('express');
var morgan = require('morgan')
var logger = require('./logger');
var build = require('./build');

var app = express();
var port = process.env['PORT'] || 8080;

app.use(morgan('combined', {stream: logger.stream}));

app.post('/build', function trigger(req, res) {
  build().then(function() {
    res.status(200).send('Ok.');
  }, function(reason) {
    res.status(500).send('Build Failed.');
  }).done();
});

app.listen(port, function server() {
  logger.info('node server listening on', port);
});
