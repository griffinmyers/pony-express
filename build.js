var config = require('./config');
var build = require('./lib/build');

var is_dev = process.argv.length > 2 && process.argv[2] === 'dev' || false
var is_script = !module.parent;

if(is_script) {
  build(config.root, config.source, config.destination, is_dev).done();
}
