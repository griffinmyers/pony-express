var path = require('path');
var _ = require('lodash');

module.exports = function wrap() {
  //
  // ## wrap
  //
  // This middleware will wrap any .html file's contents in
  //
  // <div class="value">
  //   *contents*
  // </div>
  //
  // if you pass a 'wrap: value' in the frontmatter.
  //
  return function _wrap(files, metalsmith) {
    _.forEach(files, function(file, file_name) {
      if(path.extname(file_name) === '.html' && _.has(file, 'wrap')) {
        var opening = Buffer('<div class="' + file.wrap + '">');
        var closing = Buffer('</div>');
        file.contents = Buffer.concat([opening, file.contents, closing]);
      }
    });
  }
}
