var _ = require('lodash');
var def = require('./default');
var dev = require('./dev');

var config = def;

switch(process.env.NODE_ENV) {
  case 'dev':
    config = _.merge(config, dev);
    break;
}

module.exports = config;
