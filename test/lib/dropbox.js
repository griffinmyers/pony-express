var should = require('should');
var nock = require('nock');
var mockfs = require('mock-fs');
var Dropbox = require('../../lib/dropbox.js');

describe('Dropbox', function() {

  beforeEach(function() {
    this.dropbox = new Dropbox('access_key', 'local');
  });

  describe('cursor()', function() {

    before(function() {
      mockfs({
        'local/.pony-token': '1989',
      });
    });

    it('reads a cursor from the file system', function(done) {
      this.dropbox.cursor().then(function(res) {
        res.should.be.exactly('1989');
        done();
      }, done).done();
    });

    it('returns null if there was a problem reading the cursor', function(done) {
      new Dropbox('access_key', 'tmp').cursor().then(function(res) {
        should.not.exist(res);
        done();
      }, done).done();
    });

  });

});