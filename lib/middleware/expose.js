var _ = require('lodash');

module.exports = function expose(modules){
  //
  // ## expose
  //
  // Expose modules to your templates via a dictionary of keys to modules.
  //
  return function _expose(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      files[file_name] = _.extend({}, modules, file);
    });
  }
}
