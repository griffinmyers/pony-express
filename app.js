var path = require('path');
global.root_require = function root_require(p) { return require(path.join(__dirname, p)); }

var url = require('url');
var _ = require('lodash');
var app = require('express')();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = root_require('config');
var logger = root_require('lib').logger;
var verify = root_require('lib').verify;
var AuthorizeController = root_require('controllers').AuthorizeController;
var DeployController = root_require('controllers').DeployController;

app.use(morgan('common', {stream: logger.stream}));

app.get('/authorize', AuthorizeController.authorize);
app.get('/authorize/redirect', AuthorizeController.redirect);
app.get('/deploy', DeployController.challenge);
app.post('/deploy', bodyParser.json({verify: verify}), DeployController.deploy);
app.post('/deploy/sync', bodyParser.json(), DeployController.deploy_sync);

app.listen(config.port, function server() {
  logger.info('node server listening on', config.port);
});
