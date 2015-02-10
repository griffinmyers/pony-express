var path = require('path');
global.root_require = function root_require(p) { return require(path.join(__dirname, p)); }

var fs = require('fs');
var _ = require('lodash');
var Q = require('q');
var path = require('path');
var Metalsmith = require('metalsmith');
var markdown = require('metalsmith-markdown');
var templates = require('metalsmith-templates');
var sass = require('metalsmith-sass');
var asset = require('metalsmith-static');
var uglify = require('metalsmith-uglify');
var concat = require('metalsmith-concat');
var logger = require('./lib').logger;
var config = require('./config');

var is_dev = process.argv.length > 2 && process.argv[2] === 'dev' || false
var is_script = !module.parent;

function metalsmith(source, destination) {

  var markdown_options = {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true};
  var templates_options = {engine: 'jade', directory: 'src/_code/templates'};
  var sass_options = {outputDir: 'assets/css'};
  var asset_options = {src: 'images', dest: 'images'};
  var concat_options = {files: '_code/scripts/**/*.js', output: 'assets/scripts/bundle.js'}
  var uglify_options = {removeOriginal: true};

  var smith = Metalsmith(__dirname)
    .source(source)
    .destination(destination)
    .use(asset(asset_options))
    .use(markdown(markdown_options))
    .use(bind_template())
    .use(two_column())
    .use(partial())
    .use(templates(templates_options))
    .use(sass(sass_options))
    .use(concat(concat_options))
    .use(uglify(uglify_options));

  if(is_dev && is_script) {
    var serve = require('metalsmith-serve');
    var watch = require('metalsmith-watch');

    smith
      .use(watch())
      .use(serve({port: process.env['PORT'] || 3000}))
      .build(function(e, files){ if(e) { throw e; } });
  }

  return smith;
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
  return function _bind_template(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(path.extname(file_name) === '.html') {
        file.template = (file.template || 'partial') + '.jade';
      }
    });
  }
}

function two_column() {
  //
  // ## two_column
  //
  // This middleware will allow 2 different markdown files to specify two
  // different columns in a layout. Just add a `left: left-page`,
  // `right: right-page` to the metadata of a file.
  //
  return function _two_column(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(_.has(file, 'left') && _.has(file, 'right')) {
        _.map(['left', 'right'], function(col) {
          var col_file_name = path.join(path.dirname(file_name), file[col] + '.html');
          file[col] = files[col_file_name].contents;
          delete files[col_file_name];
        });
      }
    });
  }
}

function partial() {
  //
  // ## partial
  //
  // This middleware will take any .md file that has `partial: whatever` in the
  // meta-data and expose its contents under 'whatever'.
  //
  return function _partial(files, metalsmith) {
    var partials = {};

    _.forEach(files, function(file, file_name) {
      if(_.has(file, 'partial')) {
        partials[file.partial] = file.contents;
        delete files[file_name];
      }
    });

    _.forEach(files, function(file, file_name) {
      if(path.extname(file_name) === '.html') {
        _.extend(file, partials);
      }
    });
  }
}

function build(source, destination) {
  return Q.ninvoke(metalsmith(source, destination), 'build');
}

if(is_script) {
  build(config.source, config.destination).done();
}

module.exports = build;
