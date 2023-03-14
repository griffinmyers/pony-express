require('should');
var url = require('url');
var config = require('../../config');
var { http, helpers: { res } } = require('wirepig');
var Store = require('../../lib/store.js');

const port = (u) => parseInt(url.parse(u).port);

describe('Store', function() {

  before(async function() {
    this.s3 = await http({ port: port(config.s3_origin) });
  });

  beforeEach(function() {
    this.store = new Store('bucket', config.s3_origin, true);
  });

  afterEach(function() {
    this.s3.reset();
  });

  after(async function() {
    await this.s3.teardown();
  })

  describe('get()', function() {
    it('gets something', function(done) {
      this.s3.mock({
        req: { method: 'GET', pathname: '/bucket/boop' },
        res: res.text('bleep')
      })

      this.store.get('boop').then(function(res) {
        res.should.be.exactly('bleep');
        done();
      }, done).done();
    });

    it('caches', function(done) {
      this.s3.mock({
        req: { method: 'GET', pathname: '/bucket/boop' },
        res: res.text('bleep')
      })

      this.store.get('boop').then(function(res) {
        res.should.be.exactly('bleep');
      }).then(function() {
        return this.store.get('boop');
      }.bind(this)).then(function(res) {
        res.should.be.exactly('bleep');
        done();
      }, done).done();
    });

    it('can not cache', function(done) {
      var uncached_store = new Store('bucket', config.s3_origin);

      for (let i = 0; i < 2; i++) {
        this.s3.mock({
          req: { method: 'GET', pathname: '/bucket/boop' },
          res: res.text('bleep')
        });
      }

      uncached_store.get('boop').then(function(res) {
        res.should.be.exactly('bleep');
      }).then(function() {
        return uncached_store.get('boop');
      }).then(function(res) {
        res.should.be.exactly('bleep');
        done()
      }, done).done();
    });
  });

  describe('put()', function() {
    it('puts something', function(done) {
      this.s3.mock({
        req: { method: 'PUT', pathname: '/bucket/boop', body: 'bleep' }
      });

      this.store.put('boop', 'bleep').then(function() {
        done();
      }, done).done();
    });
  });
});
