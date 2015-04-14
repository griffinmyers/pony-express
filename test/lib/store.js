var should = require('should');
var nock = require('nock');
var Store = require('../../lib/store.js');

describe('Store', function() {

  beforeEach(function() {
    this.store = new Store('bucket', true);
  });

  describe('get', function() {
    it('gets something', function(done) {
      var amazon = nock('https://bucket.s3.amazonaws.com:443')
        .get('/boop')
        .reply(200, 'bleep');

      this.store.get('boop').then(function(res) {
        res.Body.toString().should.be.exactly('bleep');
        amazon.done();
        done();
      }, done).done();
    });

    it('caches', function(done) {
      var amazon = nock('https://bucket.s3.amazonaws.com:443')
        .get('/boop')
        .reply(200, 'bleep');

      this.store.get('boop').then(function(res) {
        res.Body.toString().should.be.exactly('bleep');
        amazon.done();
      }).then(function() {
        return this.store.get('boop');
      }.bind(this)).then(function(res) {
        res.Body.toString().should.be.exactly('bleep');
        done();
      }, done).done();
    });

    it('can not cache', function(done) {
    var uncached_store = new Store('bucket');
    var amazon = nock('https://bucket.s3.amazonaws.com:443')
      .get('/boop')
      .times(2)
      .reply(200, 'bleep');

      uncached_store.get('boop').then(function(res) {
        res.Body.toString().should.be.exactly('bleep');
      }).then(function() {
        return uncached_store.get('boop');
      }).then(function(res) {
        res.Body.toString().should.be.exactly('bleep');
        amazon.done();
        done()
      }, done).done();
    });
  });

  describe('put', function() {
    it('puts something', function(done) {
      var amazon = nock('https://bucket.s3.amazonaws.com:443')
        .put('/boop', 'bleep')
        .reply(200);

      this.store.put('boop', 'bleep').then(function() {
        amazon.done();
        done();
      }, done).done();
    });
  });
});
