var path = require('path');
var _ = require('lodash');

module.exports = function row() {
  //
  // ## row
  //
  // This middleware will allow many markdown files to be the rows in a layout.
  // Just add a `rows: row1, row1, row3` attribute to the metadata of a file.
  //
  return function _row(files) {
    _.forEach(files, function(file, file_name) {
      if(_.has(file, 'rows')) {
        file['rows'] = _.map(_.map(file['rows'].split(','), _.trim), function(row) {
          var row_file_name = path.join(path.dirname(file_name), row + '.html');
          var row_file = files[row_file_name];
          var row_obj = {contents: files[row_file_name] && files[row_file_name].contents, two_column: false};

          if(_.has(row_file, 'left') && _.has(row_file, 'right')) {
            row_obj = _.extend({}, row_obj, {
              two_column: true,
              left: row_file['left'],
              right: row_file['right']
            });
          }

          delete files[row_file_name];
          return row_obj;
        });
      }
    });
  }
}
