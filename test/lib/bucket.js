var should = require('should');
var nock = require('nock');
var Bucket = require('../../lib/bucket.js');
var mockfs = require('mock-fs');

describe('Bucket', function() {

  beforeEach(function() {
    this.bucket = new Bucket('local', 'remote');
  });

  describe('get_local_manifest()', function() {

    beforeEach(function() {
      mockfs({
        'local/dir': {
          'runner.txt': 'This mighty river is my saviour and my sin',
          'empty-dir': {}
        },
        'local/loveisall.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
        'some/other/path': {},
        'some/other/file.jpg': 'Well I walk upon the river like its easier than land',
        'local/permissions.jpg': mockfs.file({mode: 0000})
      });
    });

    afterEach(function() {
      mockfs.restore();
    });

    it('reads the fs for a local manifest', function(done) {
      this.bucket.get_local_manifest().then(function(manifest) {
        manifest.should.have.property('dir/runner.txt', '65407f0c8847ca88adc2d74a66c32978382207f4');
        manifest.should.have.property('loveisall.jpg', '994a799d745100869cc0aaf2c09d2602d44b1c93');
        manifest.should.not.have.property('local/permissions.jpg');
        manifest.should.not.have.property('some/other/path');
        manifest.should.not.have.property('local/dir/empty-dir');
        done();
      }, done).done();
    });

  });

  describe('get_remote_manifest()', function() {

    it('hits the WWW for a manifest', function(done) {

      var expect = {
        'dir/runner.txt': '65407f0c8847ca88adc2d74a66c32978382207f4',
        'loveisall.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93'
      }

      var amazon = nock('https://remote.s3.amazonaws.com:443')
        .get('/.pony-manifest')
        .reply(200, expect);

      this.bucket.get_remote_manifest().then(function(manifest) {
        manifest.should.have.property('dir/runner.txt', expect['dir/runner.txt']);
        manifest.should.have.property('loveisall.jpg', expect['loveisall.jpg']);
        amazon.done();
        done();
      }, done).done();
    });

  });

});