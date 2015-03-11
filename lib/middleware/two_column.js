var path = require('path');
var _ = require('lodash');

module.exports = function two_column() {
  //
  // ## two_column
  //
  // This middleware will allow 2 different markdown files to specify two
  // different columns in a layout. Just add a `left: left-page`,
  // `right: right-page` to the metadata of a file.
  //
  // Any HTML contents can be accessed via `left` and `right` in the template.
  //
  return function _two_column(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(_.has(file, 'left') && _.has(file, 'right')) {
        _.forEach(['left', 'right'], function(col) {
          var col_file_name = path.join(path.dirname(file_name), file[col] + '.html');
          file[col] = files[col_file_name] && files[col_file_name].contents;
          delete files[col_file_name];
        });
      }
    });
  }
}
