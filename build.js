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
var logger = require('./lib').logger;
var config = require('./config');

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
  .source(config.source)
  .destination(config.destination)
  .use(asset(asset_options))
  .use(markdown(markdown_options))
  .use(bind_template())
  .use(templates('jade'))
  .use(sass(sass_options))

if(is_dev && is_script) {
  metalsmith
    .use(watch())
    .use(serve({port: process.env['PORT'] || 3000}))
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
  //
  // ## bind_template
  //
  // This middleware will add template metadata to any files that don't specify
  // one. I don't want my buddy to have to know what 'jade' is or think much
  // about templates unless he really wants to, so this is a reasonable default
  // I think.
  //
  return function bt(files, metalsmith) {
    _.forEach(files, function(f, file_name) {
      if(path.extname(file_name) === '.html') {
        f.template = (f.template || 'page') + '.jade';
      }
    });
  }
}

function build() {
  return Q.ninvoke(metalsmith, 'build');
}

module.exports = build;
