var path = require('path');
var moment = require('moment');

module.exports = {
  43720278: {
    bucket: 'joeshaner.com',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'collections', args: {posts: {pattern: 'blog/**/*.md', sortBy: 'date', reverse: true, metadata: {template: 'page'}}}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'wrap'},
        {name: 'clean', args: 'blog'},
        {name: 'page', args: {collection: 'posts', perPage: 3, target: 'blog', template: 'blog'}},
        {name: 'bind_template'},
        {name: 'two_column'},
        {name: 'row'},
        {name: 'partial'},
        {name: 'expose', args: {moment: moment}},
        {name: 'templates', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'uglify', args: {removeOriginal: true}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ];
    }
  },
  // 544017: {
  //   bucket: 'pony-express-dev',
  //   middleware: function(source) {
  //     return [
  //       {name: 'asset', args: {src: 'images', dest: 'images'}},
  //       {name: 'collections', args: {posts: {pattern: 'blog/**/*.md', sortBy: 'date', reverse: true, metadata: {template: 'page'}}}},
  //       {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
  //       {name: 'wrap'},
  //       {name: 'clean', args: 'blog'},
  //       {name: 'page', args: {collection: 'posts', perPage: 3, target: 'blog', template: 'blog'}},
  //       {name: 'bind_template'},
  //       {name: 'two_column'},
  //       {name: 'row'},
  //       {name: 'partial'},
  //       {name: 'expose', args: {moment: moment}},
  //       {name: 'templates', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
  //       {name: 'sass', args: {outputDir: 'assets/css'}},
  //       {name: 'uglify', args: {removeOriginal: true}},
  //       {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
  //       {name: 'clean', args: '_code'},
  //       {name: 'clean', args: '.pony-token'}
  //     ];
  //   }
  // },
  544017: {
    bucket: 'wgm.cool',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'collections', args: {posts: {pattern: 'blog/**/*.md', sortBy: 'date', reverse: true, metadata: {template: 'page'}}}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'wrap'},
        {name: 'clean', args: 'blog'},
        {name: 'page', args: {collection: 'posts', perPage: 3, target: 'blog', template: 'blog'}},
        {name: 'bind_template'},
        {name: 'partial'},
        {name: 'expose', args: {moment: moment}},
        {name: 'templates', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ];
    }
  }
};
