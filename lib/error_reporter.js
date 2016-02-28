var _ = require('lodash');
var path = require('path');
var jade = require('jade');
var config = root_require('config');
var error_file = path.join(__dirname, '..', 'views', 'error.jade');
var error_page = jade.compileFile(error_file);

//
// # ErrorReporter
//
// If there is an error during the build, this will handle uploading an error
// page to the target website for easy debugging.
//
function ErrorReporter(bucket) {
  //
  // ## ErrorReporter
  //
  // Accepts a `lib/bucket` instance to set/clear errors on.
  //
  this.bucket = bucket;
}

_.extend(ErrorReporter.prototype, {
  set: function set(e) {
    //
    // ## set
    //
    // Sets the error page.
    //
    var content = error_page({content: e});

    return this.bucket.upload(config.error_path, content, 'html');
  },
  clear: function clear() {
    //
    // ## clear
    //
    // Clears the error page.
    //
    return this.bucket.del(config.error_path);
  }
});

module.exports = ErrorReporter
