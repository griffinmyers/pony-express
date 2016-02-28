require('should');
var nock = require('nock');
var ErrorReporter = require('../../lib/error_reporter.js');
var Bucket = require('../../lib/bucket.js');
var config = require('../../config');

describe('ErrorReporter', function() {

  before(function() {
    var bucket = new Bucket('local', 'remote');
    this.error_reporter = new ErrorReporter(bucket);
  });

  describe('set()', function() {


    it('sets the error page', function(done) {
      var amazon = nock('https://remote.s3.amazonaws.com:443')
        .put('/' + config.error_path, /doh!/)
        .reply(200);

      this.error_reporter.set('doh!').then(function(res) {
        res.should.have.property('Location');
        amazon.done();
        done();
      }, done).done();
    });

  });

  describe('clear()', function() {

    it('clears the error page', function(done) {
      var amazon = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', /Delete/)
        .reply(200, '');

      this.error_reporter.clear().then(function(res) {
        amazon.done();
        done();
      }, done).done();
    });
  });

});