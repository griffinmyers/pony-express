var path = require('path');
var moment = require('moment');

module.exports = {
  'dbid:AAAmODwud0T-852J1qsHTowRprA7fLuQACY': {
    bucket: 'joeshaner.com',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'asset', args: {src: 'fonts', dest: 'fonts'}},
        {name: 'collections', args: {posts: {pattern: 'blog/**/*.md', sortBy: 'date', reverse: true}}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'wrap'},
        {name: 'clean', args: 'blog'},
        {name: 'page', args: {collection: 'posts', perPage: 7, target: 'blog', template: 'blog', perma: true}},
        {name: 'bind_template'},
        {name: 'two_column'},
        {name: 'row'},
        {name: 'partial'},
        {name: 'expose', args: {moment: moment}},
        {name: 'layouts', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'uglify', args: {removeOriginal: true}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ];
    }
  },
  'dbid:AAAkhz_MuWd2QM3Z_OsIX4_zI6a8oGN7LEs': {
    bucket: 'wgm.cool',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'collections', args: {posts: {pattern: 'blog/**/*.md', sortBy: 'date', reverse: true}}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'wrap'},
        {name: 'clean', args: 'blog'},
        {name: 'page', args: {collection: 'posts', perPage: 3, target: 'blog', template: 'blog', perma: true}},
        {name: 'bind_template'},
        {name: 'partial'},
        {name: 'expose', args: {moment: moment}},
        {name: 'layouts', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ];
    }
  },
  'dbid:AACb7RhYLFLPXFdpsfpXQl7H_svGqaZy4TU': {
    bucket: 'www.fallcreekfarm.org',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'collections', args: {recipes: {pattern: 'recipes/**/*.md', sortBy: 'date', reverse: true}}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'wrap'},
        {name: 'clean', args: 'recipes'},
        {name: 'page', args: {collection: 'recipes', perPage: 3, target: 'recipes', template: 'recipes'}},
        {name: 'bind_template'},
        {name: 'partial'},
        {name: 'expose', args: {moment: moment}},
        {name: 'layouts', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'uglify', args: {removeOriginal: true}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'move', args: {source: '_code/fonts', destination: 'assets/fonts'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ];
    }
  },
  'dbid:AAB0k_SPy_bqLAEy9RGogi8phuxn5CkswyU': {
    bucket: 'ramblinrunner.com',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'asset', args: {src: 'fonts', dest: 'fonts'}},
        {name: 'collections', args: {posts: {pattern: 'blog/**/*.md', sortBy: 'date', reverse: true}}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'wrap'},
        {name: 'clean', args: 'blog'},
        {name: 'page', args: {collection: 'posts', perPage: 3, target: '', template: 'blog', perma: true}},
        {name: 'bind_template'},
        {name: 'two_column'},
        {name: 'row'},
        {name: 'partial'},
        {name: 'expose', args: {moment: moment}},
        {name: 'layouts', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ];
    }
  },
  'dbid:AAAsnaSC-xzHIgiN9OGhS8HwalfvK3cpfg0': {
    bucket: 'brandonkreitler.com',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'asset', args: {src: 'fonts', dest: 'fonts'}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'bind_template'},
        {name: 'partial'},
        {name: 'layouts', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ]
    }
  },
  'dbid:AAAokovl6EtZgXd7CFo3iy0RXjJpTeqogVc': {
    bucket: 'cragcation.com',
    middleware: function(source) {
      return [
        {name: 'asset', args: {src: 'images', dest: 'images'}},
        {name: 'collections', args: {posts: {pattern: 'posts/**/*.md', sortBy: 'date', reverse: true}}},
        {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
        {name: 'wrap'},
        {name: 'clean', args: 'posts'},
        {name: 'page', args: {collection: 'posts', perPage: 3, target: '', template: 'post', perma: true}},
        {name: 'bind_template'},
        {name: 'partial'},
        {name: 'expose', args: {moment: moment}},
        {name: 'layouts', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
        {name: 'sass', args: {outputDir: 'assets/css'}},
        {name: 'move', args: {source: '_code/scripts', destination: 'assets/scripts'}},
        {name: 'clean', args: '_code'},
        {name: 'clean', args: '.pony-token'}
      ]
    }
  }
};
