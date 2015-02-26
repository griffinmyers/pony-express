var _ = require('lodash');
var Q = require('q');
var Metalsmith = require('metalsmith');
var pony_middleware = require('./middleware');

var middleware_map = {
  'markdown': require('metalsmith-markdown'),
  'templates': require('metalsmith-templates'),
  'sass': require('metalsmith-sass'),
  'asset': require('metalsmith-static'),
  'collections': require('metalsmith-collections'),
  'uglify': require('metalsmith-uglify'),
  'paginate': require('metalsmith-paginate'),
  'permalinks': require('metalsmith-permalinks'),
  'bind_template': pony_middleware.bind_template,
  'two_column': pony_middleware.two_column,
  'row': pony_middleware.row,
  'partial': pony_middleware.partial,
  'move': pony_middleware.move,
  'clean': pony_middleware.clean
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
      .use(serve({port: process.env['PORT'] || 3000}))
      .build(function(e, files){ if(e) { throw e; } });
  }

  return smith;
}

function build(root, source, destination, middleware, dev) {
  return Q.ninvoke(metalsmith(root, source, destination, middleware, dev), 'build');
}

module.exports = build;
