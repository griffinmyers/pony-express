var path = require('path');
var _ = require('lodash');

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

function clean(p) {
  //
  // ## clean
  //
  // This middleware will delete the path passed.
  //
  return function _clean(files, metalsmith) {
    _.forEach(_.keys(files), function(f) {
      if(f.indexOf(p) === 0) {
        delete files[f];
      }
    });
  }
}

function move(obj) {
  //
  // ## move
  //
  // This middleware will move files in obj.source to obj.dest
  //
  return function _move(files, metalsmith) {
    _.forEach(_.keys(files), function(f) {
      if(f.indexOf(obj.source) === 0) {
        files[path.join(obj.destination, path.relative(obj.source, f))] = files[f];
        delete files[f];
      }
    });
  }
}

module.exports = {
  bind_template: bind_template,
  two_column: two_column,
  partial: partial,
  clean: clean,
  move: move
};
