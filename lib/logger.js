var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      name: 'app',
      filename: 'pony-express.log',
      level: 'info'
    }),
    new (winston.transports.Console)({
      colorize: true,
      prettyPrint: true,
      level: 'info'
    })
  ]
});

logger.morgan = {
  skip: function(req, res) {
    return res.statusCode < 400
  },
  stream: {
    write: function write(message, encoding) {
      logger.error(message.slice(0, -1));
    }
  }
}

module.exports = logger;
