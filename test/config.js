var path = require('path');
var should = require('should');

describe('Config', function(){
  describe('default', function() {
    it('loads the default config', function() {
      var c = require('../config');
      c.redirect_uri.should.be.exactly('http://localhost:3000/authorize/redirect');
    });
  });

  describe('dev', function() {
    it('loads the dev config', function() {
      process.env.NODE_ENV = 'dev';
      delete require.cache[path.join(__dirname, '..', 'config', 'index.js')]
      var c = require('../config');
      c.redirect_uri.should.be.exactly('https://ponyexprss.com/authorize/redirect');
    });
  });
});