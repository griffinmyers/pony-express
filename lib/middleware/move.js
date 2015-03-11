var path = require('path');
var _ = require('lodash');

module.exports = function move(options) {
  //
  // ## move
  //
  // This middleware will move files in options.source to options.dest
  //
  return function _move(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(file_name.indexOf(options.source) === 0) {
        files[path.join(options.destination, path.relative(options.source, file_name))] = files[file_name];
        delete files[file_name];
      }
    });
  }
}
