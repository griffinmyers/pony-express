var _ = require('lodash');
var Q = require('q');
var path = require('path');

var Metalsmith = require('metalsmith');
var markdown = require('metalsmith-markdown');
var templates = require('metalsmith-templates');
var serve = require('metalsmith-serve');
var sass = require('metalsmith-sass');
var watch = require('metalsmith-watch');
var asset = require('metalsmith-static');

var logger = require('./logger');

var markdown_options = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: true
};

var sass_options = {
  outputDir: 'css'
};

var asset_options = {
  src: 'images',
  dest: 'images'
};

var is_dev = process.argv.length > 2 && process.argv[2] === 'dev' || false
var is_script = !module.parent;

var metalsmith = Metalsmith(__dirname)
  .use(asset(asset_options))
  .use(markdown(markdown_options))
  .use(bind_template())
  .use(templates('jade'))
  .use(sass(sass_options))

if(is_dev && is_script) {
  metalsmith
    .use(watch())
    .use(serve({port: 3000}))
    .build(build_handler);
}

if(is_script) {
  build();
}

function build_handler(error, files) {
  if(error) {
    throw error;
  }
}

function bind_template() {
  return function bt(files, metalsmith) {
    _.forEach(files, function(f, file_name) {
      if(path.extname(file_name) === '.html') {
        f.template = (f.template || 'page') + '.jade';
      }
    });
  }
}

function debug(files, metalsmith) {
  console.log(files);
  console.log(metalsmith);
}

function build() {
  return Q.ninvoke(metalsmith, 'build').then(function() {
    logger.info('Build completed');
  }, function(reason) {
    logger.error('Build failed', reason);
    throw reason;
  });
}

module.exports = build;
