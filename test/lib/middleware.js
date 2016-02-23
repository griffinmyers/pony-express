require('should');
var middleware = require('../../lib/middleware');
var bind_template = middleware.bind_template;
var clean = middleware.clean;
var expose = middleware.expose;
var move = middleware.move;
var page = middleware.page;
var partial = middleware.partial;
var row = middleware.row;
var two_column = middleware.two_column;
var wrap = middleware.wrap;

describe('Middlware', function() {
  beforeEach(function() {
    this.files = {
      'b.html': {template: 'page'},
      'a/b.html': {template: 'page'},
      'a/c.html': {},
      'a/b.css': {},
      'a/d/e.js': {}
    }
  });

  describe('bind_template()', function() {
    it('adds .jade to html', function() {
      bind_template()(this.files);
      this.files['b.html'].should.have.property('template', 'page.jade');
      this.files['a/b.html'].should.have.property('template', 'page.jade');
    });

    it('adds .jade to html that dont have a template', function() {
      bind_template()(this.files);
      this.files['a/c.html'].should.have.property('template', 'partial.jade');
    });

    it('adds leaves non-html this.files alone', function() {
      bind_template()(this.files);
      this.files['a/b.css'].should.be.empty;
    });
  });

  describe('clean()', function() {
    it('removes this.files', function() {
      clean('b.html')(this.files);
      this.files.should.not.have.property('b.html');
      this.files.should.have.property('a/b.html');
      this.files.should.have.property('a/c.html');
      this.files.should.have.property('a/b.css');
    });

    it('removes this.files based on the prefix', function() {
      clean('a')(this.files);
      this.files.should.have.property('b.html');
      this.files.should.not.have.property('a/b.html');
      this.files.should.not.have.property('a/c.html');
      this.files.should.not.have.property('a/b.css');
    });
  });

  describe('expose()', function() {
    it('exposes variables', function() {
      expose({dale_cooper: 'Damn Good Coffee'})(this.files);
      this.files['b.html'].should.have.property('dale_cooper', 'Damn Good Coffee')
    });
  });

  describe('move()', function() {
    it('moves this.files', function() {
      move({source: 'a', destination: 'c'})(this.files)
      this.files.should.have.property('b.html');
      this.files.should.have.property('c/b.html');
      this.files.should.have.property('c/c.html');
      this.files.should.have.property('c/b.css');
      this.files.should.have.property('c/d/e.js');
      this.files.should.not.have.property('a/b.html');
      this.files.should.not.have.property('a/c.html');
      this.files.should.not.have.property('a/b.css');
    });

    it('moves this.files from one nested dir to another', function() {
      move({source: 'a/d', destination: 'a'})(this.files);
      this.files.should.have.property('b.html');
      this.files.should.have.property('a/b.html');
      this.files.should.have.property('a/c.html');
      this.files.should.have.property('a/b.css');
      this.files.should.have.property('a/e.js');
      this.files.should.not.have.property('a/d/e.js');
    });

    it('overrides existing this.files', function() {
      move({source: 'a/b.html', destination: 'a/c.html'})(this.files);
      this.files.should.containDeep({'a/c.html': {template: 'page'}});
    });
  });

  describe('page()', function() {
    beforeEach(function() {
      this.metalsmith = {
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
      page()(this.files, this.metalsmith);
      this.files.should.have.property('blog/index.html');
      this.files['blog/index.html'].should.have.property('prev', null);
      this.files['blog/index.html'].should.have.property('next', 2);
      this.files['blog/index.html'].should.have.property('target', 'blog');
      this.files['blog/index.html'].should.have.property('template', 'page');
      this.files['blog/index.html'].should.have.property('contents');
      this.files['blog/index.html']['contents'].should.be.type('object');
      this.files['blog/index.html'].should.have.property('posts');
      this.files['blog/index.html']['posts'].should.have.length(3);

      this.files.should.have.property('blog/2/index.html');
      this.files['blog/2/index.html'].should.have.property('prev', 1);
      this.files['blog/2/index.html'].should.have.property('next', null);
      this.files['blog/2/index.html'].should.have.property('posts');
      this.files['blog/2/index.html']['posts'].should.have.length(1);

      this.files['blog/index.html'].posts[0].should.have.property('date', '2015-01-01');
      this.files['blog/index.html'].posts[0].should.have.property('title', 'Post 1');
      this.files['blog/index.html'].posts[0].should.have.property('date_string', '2015-01-01');

      this.files['blog/index.html'].posts[1].should.have.property('date', '2015-01-02');
      this.files['blog/index.html'].posts[1].should.have.property('title', 'Post 2');
      this.files['blog/index.html'].posts[1].should.have.property('date_string', '2015-01-02');

      this.files['blog/index.html'].posts[2].should.have.property('date', '2015-01-03');
      this.files['blog/index.html'].posts[2].should.have.property('title', 'Post 3');
      this.files['blog/index.html'].posts[2].should.have.property('date_string', '2015-01-03');

      this.files['blog/2/index.html'].posts[0].should.have.property('date', '2015-01-04');
      this.files['blog/2/index.html'].posts[0].should.have.property('title', 'Post 4');
      this.files['blog/2/index.html'].posts[0].should.have.property('date_string', '2015-01-04');
    });

    it('pages the links properly', function() {
      page({perPage: 1})(this.files, this.metalsmith);
      this.files.should.have.property('blog/index.html');
      this.files['blog/index.html'].should.have.property('prev', null);
      this.files['blog/index.html'].should.have.property('next', 2);

      this.files.should.have.property('blog/2/index.html');
      this.files['blog/2/index.html'].should.have.property('prev', 1);
      this.files['blog/2/index.html'].should.have.property('next', 3);

      this.files.should.have.property('blog/3/index.html');
      this.files['blog/3/index.html'].should.have.property('prev', 2);
      this.files['blog/3/index.html'].should.have.property('next', 4);

      this.files.should.have.property('blog/4/index.html');
      this.files['blog/4/index.html'].should.have.property('prev', 3);
      this.files['blog/4/index.html'].should.have.property('next', null);
    });

    it('lets me change collections', function() {
      this.metalsmith._metadata['boops'] = this.metalsmith._metadata['posts'];
      delete this.metalsmith._metadata['posts'];

      page({collection: 'boops'})(this.files, this.metalsmith);
      this.files.should.have.property('blog/index.html');
      this.files.should.have.property('blog/2/index.html');
    });

    it('lets me change targets', function() {
      page({target: 'boops'})(this.files, this.metalsmith);
      this.files.should.have.property('boops/index.html');
      this.files.should.have.property('boops/2/index.html');
    });


    it('lets me change templates', function() {
      page({template: 'boops'})(this.files, this.metalsmith);
      this.files.should.have.property('blog/index.html');
      this.files['blog/index.html'].should.have.property('template', 'boops');
      this.files.should.have.property('blog/2/index.html');
      this.files['blog/2/index.html'].should.have.property('template', 'boops');
    });

    it('lets me create permalinks', function() {
      page({perma: 'true'})(this.files, this.metalsmith);
      this.files.should.have.property('blog/index.html');
      this.files.should.have.property('blog/2/index.html');

      this.files.should.have.property('blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html');
      this.files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('template', 'page');
      this.files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('prev', null);
      this.files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('next', null);
      this.files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html'].should.have.property('contents')
      this.files['blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0/index.html']['contents'].should.be.type('object');

      this.files.should.have.property('blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html');
      this.files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('template', 'page');
      this.files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('prev', null);
      this.files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('next', null);
      this.files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html'].should.have.property('contents')
      this.files['blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177/index.html']['contents'].should.be.type('object');


      this.files.should.have.property('blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html');
      this.files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('template', 'page');
      this.files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('prev', null);
      this.files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('next', null);
      this.files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html'].should.have.property('contents')
      this.files['blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a/index.html']['contents'].should.be.type('object');


      this.files.should.have.property('blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html');
      this.files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('template', 'page');
      this.files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('prev', null);
      this.files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('next', null);
      this.files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html'].should.have.property('contents')
      this.files['blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6/index.html']['contents'].should.be.type('object');

      this.files['blog/index.html']['posts'][0].should.have.property('perma_link', '/blog/archive/a52dc9c71d83643d76dfd94d911475c3aa3e29b0');
      this.files['blog/index.html']['posts'][1].should.have.property('perma_link', '/blog/archive/0e8a3466832ec5cebefd8cc299e240383be38177');
      this.files['blog/index.html']['posts'][2].should.have.property('perma_link', '/blog/archive/90c5cd937ff6c221a14b89799c4c541ad6cf1e0a');
      this.files['blog/2/index.html']['posts'][0].should.have.property('perma_link', '/blog/archive/b515c81d47640fb1d19b6441e7902e37070b2dc6');
    });

    it('deals with parsed dates', function() {
      var metalsmith = {
        '_metadata': {
          'posts': [
            {date: new Date('2015-01-01'), title: 'Post 1'},
            {date: new Date('2015-01-02'), title: 'Post 2'},
            {date: new Date('2015-01-03'), title: 'Post 3'},
            {date: new Date('2015-01-04'), title: 'Post 4'}
          ]
        }
     };

      page()(this.files, metalsmith);

      this.files['blog/index.html'].posts[0]['date'].should.be.type('object');
      this.files['blog/index.html'].posts[0].should.have.property('date_string', '2015-01-01');

      this.files['blog/index.html'].posts[1]['date'].should.be.type('object');
      this.files['blog/index.html'].posts[1].should.have.property('date_string', '2015-01-02');

      this.files['blog/index.html'].posts[2]['date'].should.be.type('object');
      this.files['blog/index.html'].posts[2].should.have.property('date_string', '2015-01-03');

      this.files['blog/2/index.html'].posts[0]['date'].should.be.type('object');
      this.files['blog/2/index.html'].posts[0].should.have.property('date_string', '2015-01-04');
    });
  });

  describe('partial()', function() {
    it('exposes partials', function() {
      this.files['d.html'] = {partial: 'd', contents: 'bloop'};
      partial()(this.files);
      this.files.should.not.have.property('d.html');
      this.files['b.html'].should.have.property('d', 'bloop');
      this.files['a/b.html'].should.have.property('d', 'bloop');
      this.files['a/c.html'].should.have.property('d', 'bloop');
      this.files['a/b.css'].should.not.have.property('d', 'bloop');
      this.files['a/d/e.js'].should.not.have.property('d', 'bloop');

    });
  });

  describe('row()', function() {
    it('Adds rows', function() {
      this.files['row1.html'] = {contents: 'bleep'};
      this.files['row2.html'] = {contents: 'bloop'};
      this.files['d.html'] =  {rows: 'row1, row2'};
      row()(this.files)

      this.files.should.not.have.property('row1.html');
      this.files.should.not.have.property('row2.html');
      this.files.should.have.property('d.html');
      this.files['d.html'].rows.should.have.length(2);
      this.files['d.html'].rows[0].should.have.property('contents', 'bleep');
      this.files['d.html'].rows[0].should.have.property('two_column', false);
      this.files['d.html'].rows[1].should.have.property('contents', 'bloop');
      this.files['d.html'].rows[1].should.have.property('two_column', false);
    });

    it('Adds rows even when this.files mismatch', function() {
      this.files['row1.html'] = {contents: 'bleep'};
      this.files['row2.html'] = {contents: 'bloop'};
      this.files['d.html'] =  {rows: 'row1, row2, row3'};

      row()(this.files)

      this.files.should.have.property('d.html');
      this.files['d.html'].rows.should.have.length(3);
      this.files['d.html'].rows[2].should.have.property('contents', undefined);
    });

    it('supports two-col layouts', function() {
      this.files['row1-left.html'] = {contents: 'bloop-left'}
      this.files['row1-right.html'] = {contents: 'bloop-right'}
      this.files['row1.html'] = {contents: 'bleep', left: 'row1-left', right: 'row1-right'};
      this.files['d.html'] =  {rows: 'row1'};
      row()(this.files)

      this.files.should.not.have.property('row1.html');
      this.files.should.have.property('d.html');
      this.files['d.html'].rows.should.have.length(1);
      this.files['d.html'].rows[0].should.have.property('contents', 'bleep');
      this.files['d.html'].rows[0].should.have.property('two_column', true);
      this.files['d.html'].rows[0].should.have.property('left', 'row1-left');
      this.files['d.html'].rows[0].should.have.property('right', 'row1-right');
    });

    it('must have a left and right col', function() {
      this.files['row1-left.html'] = {contents: 'bloop-left'}
      this.files['row1-right.html'] = {contents: 'bloop-right'}
      this.files['row1.html'] = {contents: 'bleep', left: 'row1-left'};
      this.files['d.html'] =  {rows: 'row1'};
      row()(this.files)

      this.files.should.not.have.property('row1.html');
      this.files.should.have.property('d.html');
      this.files['d.html'].rows.should.have.length(1);
      this.files['d.html'].rows[0].should.have.property('contents', 'bleep');
      this.files['d.html'].rows[0].should.have.property('two_column', false);
      this.files['d.html'].rows[0].should.not.have.property('left');
      this.files['d.html'].rows[0].should.not.have.property('right');
    });
  });

  describe('two_column()', function() {
    it('supports two columns', function() {
      this.files['left.html'] = {contents: 'bleep'};
      this.files['right.html'] = {contents: 'bloop'};
      this.files['d.html'] =  {left: 'left', right: 'right'};

      two_column()(this.files)
      this.files.should.have.property('d.html');
      this.files.should.not.have.property('left.html');
      this.files.should.not.have.property('right.html');
      this.files['d.html'].should.have.property('left', 'bleep');
      this.files['d.html'].should.have.property('right', 'bloop');
    });

    it('must have two columns', function() {
      this.files['left.html'] = {contents: 'bleep'};
      this.files['d.html'] =  {left: 'left'};

      two_column()(this.files)
      this.files.should.have.property('d.html');
      this.files.should.have.property('left.html');
    });
  });

  describe('wrap()', function() {
    it('wraps', function() {
      this.files['d.html'] = {contents: new Buffer('bleep'), wrap: 'bloop'}

      wrap()(this.files)
      this.files.should.have.property('d.html');
      this.files['d.html'].should.have.property('contents');
      this.files['d.html']['contents'].toString().should.be.equal('<div class="bloop">bleep</div>');
    });

    it('wraps empty', function() {
      this.files['d.html'] = {contents: new Buffer('bleep'), wrap: ''}

      wrap()(this.files)
      this.files.should.have.property('d.html');
      this.files['d.html'].should.have.property('contents');
      this.files['d.html']['contents'].toString().should.be.equal('<div class="">bleep</div>');
    });
  });
});