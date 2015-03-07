global.root_require = function root_require(p) { return require(require('path').join(__dirname, p)); }

var app = require('express')();
var morgan = require('morgan');
var config = root_require('config');
var logger = root_require('lib').logger;
var router = root_require('routes');

app.set('view engine', 'jade');
app.use(morgan('common', logger.morgan));
app.use('/', router);

app.listen(config.port, function server() {
  logger.info('port for the buddies >>>', config.port);
});
