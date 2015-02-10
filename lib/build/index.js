var path = require('path');
var fs = require('fs');
var Q = require('q');
var Metalsmith = require('metalsmith');
var markdown = require('metalsmith-markdown');
var templates = require('metalsmith-templates');
var sass = require('metalsmith-sass');
var asset = require('metalsmith-static');
var uglify = require('metalsmith-uglify');
var middleware = require('./middleware');

function metalsmith(root, source, destination, dev) {

  var markdown_options = {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true};
  var templates_options = {engine: 'jade', directory: path.join(source, '_code', 'templates')};
  var sass_options = {outputDir: 'assets/css'};
  var asset_options = {src: 'images', dest: 'images'};
  var uglify_options = {removeOriginal: true};
  var move_options = {source: '_code/scripts', destination: 'assets/scripts'}

  var smith = Metalsmith(root)
    .source(source)
    .destination(destination)
    .use(asset(asset_options))
    .use(markdown(markdown_options))
    .use(middleware.bind_template())
    .use(middleware.two_column())
    .use(middleware.partial())
    .use(templates(templates_options))
    .use(sass(sass_options))
    .use(uglify(uglify_options))
    .use(middleware.move(move_options))
    .use(middleware.clean('_code'));

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

function build(root, source, destination, dev) {
  return Q.ninvoke(metalsmith(root, source, destination, dev), 'build');
}

module.exports = build;
