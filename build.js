global.root_require = function root_require(p) { return require(require('path').join(__dirname, p)); }

var path = require('path');
var config = require('./config');
var build = require('./lib/build');
var Bucket = require('./lib/bucket');
var Dropbox = require('./lib/dropbox');
var logger = require('./lib/logger');
var store = new (require('./lib/store'))(config.key_bucket);

if(process.argv.length < 3) {
  logger.info('Usage: node build.js id [dev, push, fetch]');
  return;
}

var id = process.argv[2];
var user = config.users[id];

var staging_dir = path.join(config.source, id.toString());
var build_dir = path.join(config.destination, id.toString());
var middleware = (user && user.middleware(staging_dir)) || [] ;

var is_dev = false;
var is_push = false;
var is_fetch = false;

if(process.argv.length > 3) {
  is_dev = process.argv[3] === 'dev';
  is_push = process.argv[3] === 'push';
  is_fetch = process.argv[3] === 'fetch';
}

var is_script = !module.parent;

if(is_fetch) {
  store.get(id).then(function(result) {
    return new Dropbox(result.Body.toString(), path.join(config.source, 'fetch')).sync();
  }).done();
}

if(is_script) {
  build(config.root, staging_dir, build_dir, middleware, is_dev).then(function(result) {
    return is_push ? new Bucket(build_dir, user.bucket).push() : result;
  }).done();
}
