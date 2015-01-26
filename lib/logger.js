var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      name: 'app',
      filename: 'app.log',
      level: 'info'
    }),
    new (winston.transports.Console)({
      colorize: true,
      prettyPrint: true,
      level: 'info'
    })
  ]
});

logger.stream = {
  write: function write(message, encoding) {
    logger.info(message.slice(0, -1));
  }
}

module.exports = logger;
