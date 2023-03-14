require('should');
var path = require('path');

describe('Config', function(){
  beforeEach(function() {
    this.NODE_ENV = process.env.NODE_ENV;
    delete require.cache[path.join(__dirname, '..', 'config', 'index.js')]
  });

  afterEach(function() {
    process.env.NODE_ENV = this.NODE_ENV;
    delete require.cache[path.join(__dirname, '..', 'config', 'index.js')]
  });

  describe('default', function() {
    it('loads the default config', function() {
      var c = require('../config');
      c.redirect_uri.should.be.exactly('http://localhost:3000/authorize/redirect');
    });
  });

  describe('dev', function() {
    it('loads the dev config', function() {
      process.env.NODE_ENV = 'dev';

      var c = require('../config');
      c.redirect_uri.should.be.exactly('https://ponyexprss.com/authorize/redirect');
    });
  });
});
