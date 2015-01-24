var Metalsmith = require('metalsmith');
var markdown = require('metalsmith-markdown');
var templates = require('metalsmith-templates');

var _ = require('lodash');
var path = require('path');

Metalsmith(__dirname)
  .use(markdown({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: true
  }))
  .use(bind_template())
  .use(templates('jade'))
  .build(build_handler);

function build_handler(error, files) {
  if(error) {
    throw error;
  }
}

function bind_template() {
  return function bt(files, metalsmith) {
    _.forEach(files, function(f, file_name) {
      if(path.extname(file_name) === '.html') {
        path_array = file_name.split('/');
        f.template = (path_array.length === 1 ? 'default' : path_array[0]) + '.jade'
      }
    });
  }
}

function debug(files, metalsmith) {
  console.log(files);
  console.log(metalsmith);
}