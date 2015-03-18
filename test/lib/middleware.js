var should = require('should');
var middleware = require('../../lib/middleware');
var bind_template = middleware.bind_template;
var clean = middleware.clean;
var move = middleware.move;

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

});