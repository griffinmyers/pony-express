require('should');
var url = require('url');
var ErrorReporter = require('../../lib/error_reporter.js');
var Bucket = require('../../lib/bucket.js');
var config = require('../../config');
var { http } = require('wirepig');

const port = (u) => parseInt(url.parse(u).port);

describe('ErrorReporter', function() {

  before(async function() {
    var bucket = new Bucket('local', 'remote', config.s3_origin);
    this.error_reporter = new ErrorReporter(bucket);

    this.s3 = await http({ port: port(config.s3_origin) });
  });

  afterEach(function() {
    this.s3.reset();
  });

  after(async function() {
    await this.s3.teardown();
  })

  describe('set()', function() {

    it('sets the error page', function(done) {
      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: `/remote/${config.error_path}`,
          body: /doh!/
        }
      });

      this.error_reporter.set('doh!').then(function(res) {
        res.should.have.property('Location');
        done();
      }, done).done();
    });

  });

  describe('clear()', function() {

    it('clears the error page', function(done) {
      this.s3.mock({
        req: {
          method: 'POST',
          pathname: '/remote',
          query: '?delete',
          body: `<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>${config.error_path}</Key></Object></Delete>`
        }
      });

      this.error_reporter.clear().then(function(res) {
        done();
      }, done).done();
    });
  });

});
