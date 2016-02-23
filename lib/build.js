var _ = require('lodash');
var Q = require('q');
var Metalsmith = require('metalsmith');
var pony_middleware = require('./middleware');

var middleware_map = {
  'markdown': require('metalsmith-markdown'),
  'layouts': require('metalsmith-layouts'),
  'sass': require('metalsmith-sass'),
  'asset': require('metalsmith-static'),
  'collections': require('metalsmith-collections'),
  'uglify': require('metalsmith-uglify'),
  'bind_template': pony_middleware.bind_template,
  'two_column': pony_middleware.two_column,
  'row': pony_middleware.row,
  'partial': pony_middleware.partial,
  'move': pony_middleware.move,
  'clean': pony_middleware.clean,
  'wrap': pony_middleware.wrap,
  'page': pony_middleware.page,
  'expose': pony_middleware.expose
};

function metalsmith(root, source, destination, middleware, dev) {

  var smith = Metalsmith(root).source(source).destination(destination);

  smith = _.reduce(middleware, function(acc, m) {
    var f = middleware_map[m.name];
    return f ? acc.use(f(m.args)) : acc;
  }, smith);

  if(dev) {
    var serve = require('metalsmith-serve');
    var watch = require('metalsmith-watch');

    smith
      .use(watch())
      .use(serve({port: process.env['PORT'] || 3000}));
  }

  return smith;
}

function build(root, source, destination, middleware, dev) {
  return Q.ninvoke(metalsmith(root, source, destination, middleware, dev), 'build');
}

module.exports = build;
