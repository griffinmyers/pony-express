var _ = require('lodash');
var express = require('express');
var morgan = require('morgan')
var logger = require('./logger');
var build = require('./build');

var app = express();
var port = process.env['PORT'] || 8080;

app.use(morgan('combined', {stream: logger.stream}));

app.post('/build', function trigger(req, res) {
  _.defer(build);
  res.status(200).send('ok');
});

app.listen(port, function server() {
  logger.info('node server listening on', port);
});
