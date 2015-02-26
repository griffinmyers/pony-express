var path = require('path');

module.exports = {
  43720278: {
    bucket: 'joeshaner.com',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'bind_template'},
        {name: 'two_column'},
        {name: 'row'},
        {name: 'partial'},
        {name: 'templates', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'uglify', args: {removeOriginal: true}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'}
      ];
    }
  },
  544017: {
    bucket: 'joeshaner-dev',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'bind_template'},
        {name: 'partial'},
        {name: 'templates', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'}
      ];
    }
  }
};
