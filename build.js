global.root_require = function root_require(p) { return require(require('path').join(__dirname, p)); }

var path = require('path');
var config = require('./config');
var build = require('./lib/build');
var Bucket = require('./lib/bucket');

if(process.argv.length < 3) {
  console.log('Usage: node build.js id [dev, push]');
  return;
}

var id = process.argv[2];
var user = config.users[id];

var staging_dir = path.join(config.source, id.toString());
var build_dir = path.join(config.destination, id.toString());
var middleware = (user && user.middleware(staging_dir)) || [] ;

var is_dev = false;
var is_push = false;

if(process.argv.length > 3) {
  is_dev = process.argv[3] === 'dev';
  is_push = process.argv[3] === 'push';
}

var is_script = !module.parent;

if(is_script) {
  build(config.root, staging_dir, build_dir, middleware, is_dev).then(function(result) {
    return is_push ? new Bucket(build_dir, user.bucket).push() : result;
  }).done();
}
