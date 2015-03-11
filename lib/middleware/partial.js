var path = require('path');
var _ = require('lodash');

module.exports = function partial() {
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
