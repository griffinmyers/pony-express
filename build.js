global.root_require = function root_require(p) { return require(require('path').join(__dirname, p)); }

var path = require('path');
var config = require('./config');
var build = require('./lib/build');

if(process.argv.length < 3) {
  console.log('Usage: node build.js id [dev]');
  return;
}

var id = process.argv[2];

var staging_dir = path.join(config.source, id.toString());
var build_dir = path.join(config.destination, id.toString());
var middleware = (config.users[id] && config.users[id].middleware(staging_dir)) || [] ;

var is_dev = process.argv.length > 3 && process.argv[3] === 'dev' || false
var is_script = !module.parent;

if(is_script) {
  build(config.root, staging_dir, build_dir, middleware, is_dev).done();
}
