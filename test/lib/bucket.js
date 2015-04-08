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

  describe('list()', function() {

    it('lists the contents of a bucket', function(done) {
      var amazon = nock('https://remote.s3.amazonaws.com:443')
        .get('/')
        .reply(200, '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>the-runner.txt</Key><LastModified>2015-04-08T02:11:10.000Z</LastModified><ETag>&quot;07acbec5291bd4c8bc1a6ead516c137e&quot;</ETag><Size>2126</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>burried/by/the/dasies.html</Key><LastModified>2015-03-26T08:19:29.000Z</LastModified><ETag>&quot;6b3ce9a3e306d8bd2baeb048f9f43d6b&quot;</ETag><Size>392</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>');

      this.bucket.list().then(function(res) {
        res.should.eql(['the-runner.txt', 'burried/by/the/dasies.html']);
        amazon.done();
        done();
      }, done).done();
    });

  });

});