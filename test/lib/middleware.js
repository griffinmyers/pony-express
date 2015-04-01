var should = require('should');
var middleware = require('../../lib/middleware');
var bind_template = middleware.bind_template;
var clean = middleware.clean;
var expose = middleware.expose;
var move = middleware.move;
var page = middleware.page;
var partial = middleware.partial;

describe('Middlware', function() {

  var files;

  beforeEach(function() {
    files = {
      'b.html': {template: 'page'},
      'a/b.html': {template: 'page'},
      'a/c.html': {},
      'a/b.css': {},
      'a/d/e.js': {}
    }
  });

  describe('bind_template()', function() {

    it('adds .jade to html', function() {
      bind_template()(files);
      files['b.html'].should.have.property('template', 'page.jade');
      files['a/b.html'].should.have.property('template', 'page.jade');
    });

    it('adds .jade to html that dont have a template', function() {
      bind_template()(files);
      files['a/c.html'].should.have.property('template', 'partial.jade');
    });

    it('adds leaves non-html files alone', function() {
      bind_template()(files);
      files['a/b.css'].should.be.empty;
    });

  });

  describe('clean()', function() {

    it('removes files', function() {
      clean('b.html')(files);
      files.should.not.have.property('b.html');
      files.should.have.property('a/b.html');
      files.should.have.property('a/c.html');
      files.should.have.property('a/b.css');
    });

    it('removes files based on the prefix', function() {
      clean('a')(files);
      files.should.have.property('b.html');
      files.should.not.have.property('a/b.html');
      files.should.not.have.property('a/c.html');
      files.should.not.have.property('a/b.css');
    });

  });

  describe('expose()', function() {
    it('exposes variables', function() {
      expose({dale_cooper: 'Damn Good Coffee'})(files);
      files['b.html'].should.have.property('dale_cooper', 'Damn Good Coffee')
    });
  });

  describe('move()', function() {

    it('moves files', function() {
      move({source: 'a', destination: 'c'})(files)
      files.should.have.property('b.html');
      files.should.have.property('c/b.html');
      files.should.have.property('c/c.html');
      files.should.have.property('c/b.css');
      files.should.have.property('c/d/e.js');
      files.should.not.have.property('a/b.html');
      files.should.not.have.property('a/c.html');
      files.should.not.have.property('a/b.css');
    });

    it('moves files from one nested dir to another', function() {
      move({source: 'a/d', destination: 'a'})(files);
      files.should.have.property('b.html');
      files.should.have.property('a/b.html');
      files.should.have.property('a/c.html');
      files.should.have.property('a/b.css');
      files.should.have.property('a/e.js');
      files.should.not.have.property('a/d/e.js');
    });

    it('overrides existing files', function() {
      move({source: 'a/b.html', destination: 'a/c.html'})(files);
      files.should.containDeep({'a/c.html': {template: 'page'}});
    });

  });

  describe('page()', function() {

    var metalsmith;

    beforeEach(function() {
      metalsmith = {
        '_metadata': {
          'posts': [
            {date: '2015-01-01', title: 'Post 1'},
            {date: '2015-01-02', title: 'Post 2'},
            {date: '2015-01-03', title: 'Post 3'},
            {date: '2015-01-04', title: 'Post 4'}
          ]
        }
      };
    });

    it('pages', function() {

      page()(files, metalsmith);
      files.should.have.property('blog/index.html');
      files['blog/index.html'].should.have.property('prev', null);
      files['blog/index.html'].should.have.property('next', 2);
      files['blog/index.html'].should.have.property('target', 'blog');
      files['blog/index.html'].should.have.property('template', 'page');
      files['blog/index.html'].should.have.property('contents');
      files['blog/index.html']['contents'].should.be.type('object');
      files['blog/index.html'].should.have.property('posts');
      files['blog/index.html']['posts'].should.have.length(3);

      files.should.have.property('blog/2/index.html');
      files['blog/2/index.html'].should.have.property('prev', 1);
      files['blog/2/index.html'].should.have.property('next', null);
      files['blog/2/index.html'].should.have.property('posts');
      files['blog/2/index.html']['posts'].should.have.length(1);

      files['blog/index.html'].posts[0].should.have.property('date', '2015-01-01');
      files['blog/index.html'].posts[0].should.have.property('title', 'Post 1');
      files['blog/index.html'].posts[0].should.have.property('date_string', '2015-01-01');

      files['blog/index.html'].posts[1].should.have.property('date', '2015-01-02');
      files['blog/index.html'].posts[1].should.have.property('title', 'Post 2');
      files['blog/index.html'].posts[1].should.have.property('date_string', '2015-01-02');

      files['blog/index.html'].posts[2].should.have.property('date', '2015-01-03');
      files['blog/index.html'].posts[2].should.have.property('title', 'Post 3');
      files['blog/index.html'].posts[2].should.have.property('date_string', '2015-01-03');

      files['blog/2/index.html'].posts[0].should.have.property('date', '2015-01-04');
      files['blog/2/index.html'].posts[0].should.have.property('title', 'Post 4');
      files['blog/2/index.html'].posts[0].should.have.property('date_string', '2015-01-04');

    });

    it('pages the links properly', function() {

      page({perPage: 1})(files, metalsmith);
      files.should.have.property('blog/index.html');
      files['blog/index.html'].should.have.property('prev', null);
      files['blog/index.html'].should.have.property('next', 2);

      files.should.have.property('blog/2/index.html');
      files['blog/2/index.html'].should.have.property('prev', 1);
      files['blog/2/index.html'].should.have.property('next', 3);

      files.should.have.property('blog/3/index.html');
      files['blog/3/index.html'].should.have.property('prev', 2);
      files['blog/3/index.html'].should.have.property('next', 4);

      files.should.have.property('blog/4/index.html');
      files['blog/4/index.html'].should.have.property('prev', 3);
      files['blog/4/index.html'].should.have.property('next', null);

    });

    it('lets me change collections', function() {

      metalsmith._metadata['boops'] = metalsmith._metadata['posts'];
      delete metalsmith._metadata['posts'];

      page({collection: 'boops'})(files, metalsmith);
      files.should.have.property('blog/index.html');
      files.should.have.property('blog/2/index.html');

    });

    it('lets me change targets', function() {

      page({target: 'boops'})(files, metalsmith);
      files.should.have.property('boops/index.html');
      files.should.have.property('boops/2/index.html');

    });


    it('lets me change templates', function() {

      page({template: 'boops'})(files, metalsmith);
      files.should.have.property('blog/index.html');
      files['blog/index.html'].should.have.property('template', 'boops');
      files.should.have.property('blog/2/index.html');
      files['blog/2/index.html'].should.have.property('template', 'boops');

    });

    it('lets me create permalinks', function() {

      page({perma: 'true'})(files, metalsmith);
      files.should.have.property('blog/index.html');
      files.should.have.property('blog/2/index.html');

      files.should.have.property('blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html');
      files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('template', 'page');
      files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('prev', null);
      files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('next', null);
      files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('contents')
      files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html']['contents'].should.be.type('object');

      files.should.have.property('blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html');
      files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('template', 'page');
      files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('prev', null);
      files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('next', null);
      files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('contents')
      files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html']['contents'].should.be.type('object');


      files.should.have.property('blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html');
      files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('template', 'page');
      files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('prev', null);
      files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('next', null);
      files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('contents')
      files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html']['contents'].should.be.type('object');


      files.should.have.property('blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html');
      files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('template', 'page');
      files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('prev', null);
      files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('next', null);
      files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('contents')
      files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html']['contents'].should.be.type('object');

      files['blog/index.html']['posts'][0].should.have.property('perma_link', '/blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0');
      files['blog/index.html']['posts'][1].should.have.property('perma_link', '/blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177');
      files['blog/index.html']['posts'][2].should.have.property('perma_link', '/blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a');
      files['blog/2/index.html']['posts'][0].should.have.property('perma_link', '/blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6');

    });

    it('deals with parsed dates', function() {

      metalsmith = {
        '_metadata': {
          'posts': [
            {date: new Date('2015-01-01'), title: 'Post 1'},
            {date: new Date('2015-01-02'), title: 'Post 2'},
            {date: new Date('2015-01-03'), title: 'Post 3'},
            {date: new Date('2015-01-04'), title: 'Post 4'}
          ]
        }
      };

      page()(files, metalsmith);

      files['blog/index.html'].posts[0]['date'].should.be.type('object');
      files['blog/index.html'].posts[0].should.have.property('date_string', '2015-01-01');

      files['blog/index.html'].posts[1]['date'].should.be.type('object');
      files['blog/index.html'].posts[1].should.have.property('date_string', '2015-01-02');

      files['blog/index.html'].posts[2]['date'].should.be.type('object');
      files['blog/index.html'].posts[2].should.have.property('date_string', '2015-01-03');

      files['blog/2/index.html'].posts[0]['date'].should.be.type('object');
      files['blog/2/index.html'].posts[0].should.have.property('date_string', '2015-01-04');

    });

  });

  describe('partial()', function() {

    it('exposes partials', function() {

      files['d.html'] = {partial: 'd', contents: 'bloop'};
      partial()(files)
      files.should.not.have.property('d.html');
      files['b.html'].should.have.property('d', 'bloop');
      files['a/b.html'].should.have.property('d', 'bloop');
      files['a/c.html'].should.have.property('d', 'bloop');
      files['a/b.css'].should.not.have.property('d', 'bloop');
      files['a/d/e.js'].should.not.have.property('d', 'bloop');

    });

  });

});