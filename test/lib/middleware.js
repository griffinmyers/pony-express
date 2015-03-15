var should = require('should');
var middleware = require('../../lib/middleware');
var bind_template = middleware.bind_template;

describe('Middlware', function() {

  describe('bind_template()', function() {

    var files;

    beforeEach(function() {
      files = {
        'a.html': {template: 'page'},
        'a/b.html': {template: 'page'},
        'a/c.html': {},
        'a/b.css': {}
      }
    });

    it('adds .jade to html', function() {
      bind_template()(files);
      files['a.html'].should.have.property('template', 'page.jade');
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

});