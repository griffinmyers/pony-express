var _ = require('lodash');

module.exports = function clean(p) {
  //
  // ## clean
  //
  // This middleware will delete the path passed.
  //
  return function _clean(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(file_name.indexOf(p) === 0) {
        delete files[file_name];
      }
    });
  }
}
