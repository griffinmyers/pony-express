var should = require('should');
var nock = require('nock');
var Bucket = require('../../lib/bucket.js');
var mockfs = require('mock-fs');

describe('Bucket', function() {

  beforeEach(function() {
    this.bucket = new Bucket('local', 'remote');
  });

  after(mockfs.restore);

  describe('get_local_manifest()', function() {
    before(function() {
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
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>the-runner.txt</Key><LastModified>2015-04-08T02:11:10.000Z</LastModified><ETag>&quot;07acbec5291bd4c8bc1a6ead516c137e&quot;</ETag><Size>2126</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>burried/by/the/dasies.html</Key><LastModified>2015-03-26T08:19:29.000Z</LastModified><ETag>&quot;6b3ce9a3e306d8bd2baeb048f9f43d6b&quot;</ETag><Size>392</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>');

      this.bucket.list().then(function(res) {
        res.should.eql(['the-runner.txt', 'burried/by/the/dasies.html']);
        amazon.done();
        done();
      }, done).done();
    });
  });

  describe('put_remote_manifest()', function() {
    it('puts the manifest', function(done) {
      var manifest = {'a':1,'b': 2};
      var amazon = nock('https://remote.s3.amazonaws.com:443')
        .put('/.pony-manifest', JSON.stringify(manifest))
        .reply(200, '');

      this.bucket.put_remote_manifest(manifest).then(function(res) {
        amazon.done();
        done();
      }, done).done();
    });
  });

  describe('del()', function() {
    it('deletes', function(done) {
      var files = ['a/b.html', 'c.json'];
      var amazon = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>a/b.html</Key></Object><Object><Key>c.json</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?><DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>c.json</Key></Deleted><Deleted><Key>a/b.html</Key></Deleted></DeleteResult>');

      this.bucket.del(files).then(function(res) {
        res.should.have.property('Deleted');
        res.should.have.property('Errors');
        res.Errors.should.be.empty;
        amazon.done();
        done();
      }, done).done();
    });

    it('short-circuits with nothing to delete', function(done) {
      this.bucket.del([]).then(function(res) {
        done();
      }, done).done();
    });
  });

  describe('upload()', function() {
    before(function() {
      mockfs({'local/loveisall.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9])});
    });

    it('uploads with a guessed mimetype', function(done) {
      var amazon = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      this.bucket.upload('loveisall.jpg').then(function(res) {
        res.should.have.property('Location');
        amazon.done();
        done();
      }, done).done();
    });
  });

  describe('upload_all()', function() {
    before(function() {
      mockfs({
        'local/loveisall.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
        'local/loveisall2.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    it('uploads everything from a manifest', function(done) {
      var list = nock('https://remote.s3.amazonaws.com:443')
        .get('/')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>');

      var del = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')

      var upload1 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var upload2 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall2.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      this.bucket.upload_all({'loveisall.jpg': 1, 'loveisall2.jpg': 2}).then(function(res) {
        list.done();
        del.done();
        upload1.done();
        upload2.done();
        done();
      }, done).done();
    });

  });

  describe('clear()', function() {
    it('clears everything from a bucket', function(done) {
      var list = nock('https://remote.s3.amazonaws.com:443')
        .get('/')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>');

      var del = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')

      this.bucket.clear().then(function(res) {
        list.done();
        del.done();
        done();
      }, done).done();;
    });
  });

  describe('upload_diff()', function() {
    before(function() {
      mockfs({
        'local/loveisall2.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
        'local/local-only.gif': new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    it('uploads a diff of what has changed', function(done) {
      var del = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>remote-only.gif</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>remote-only.gif</Key></Deleted></DeleteResult>')

      var upload1 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall2.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var upload2 = nock('https://remote.s3.amazonaws.com:443')
        .put('/local-only.gif', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var remote = {'loveisall.jpg': 1, 'loveisall2.jpg': 2, 'remote-only.gif': 4};
      var local = {'loveisall.jpg': 1, 'loveisall2.jpg': 3, 'local-only.gif': 5};

      this.bucket.upload_diff(remote, local).then(function(res) {
        del.done();
        upload1.done();
        upload2.done();
        done();
      }, done).done();
    });
  });

  describe('push()', function() {
    before(function() {
      mockfs({
        'local/loveisall.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
        'local/loveisall2.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9]),
        'local/local-only.gif': new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    it('reads local and remote manifests and pushes the logical diff', function(done) {
      var remote_manifest = nock('https://remote.s3.amazonaws.com:443')
        .get('/.pony-manifest')
        .reply(200, {
          'loveisall.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93',
          'loveisall2.jpg': 2,
          'remote-only.gif': 4
        });

      var del = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>remote-only.gif</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>remote-only.gif</Key></Deleted></DeleteResult>')

      var upload1 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall2.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var upload2 = nock('https://remote.s3.amazonaws.com:443')
        .put('/local-only.gif', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var put_manifest = nock('https://remote.s3.amazonaws.com:443')
        .put('/.pony-manifest', function(body) {
          return (body.hasOwnProperty('local-only.gif') &&
                  body.hasOwnProperty('loveisall.jpg') &&
                  body.hasOwnProperty('loveisall2.jpg'));
        })
        .reply(200, '');

      this.bucket.push().then(function() {
        remote_manifest.done();
        del.done();
        upload1.done();
        upload2.done();
        put_manifest.done();
        done();
      }, done).done();

    });

    it('uploads everything if there was a problem getting the remote manifest', function(done) {
      var remote_manifest = nock('https://remote.s3.amazonaws.com:443')
        .get('/.pony-manifest')
        .reply(404);

      var list = nock('https://remote.s3.amazonaws.com:443')
        .get('/')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>');

      var del = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')

      var upload1 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall2.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var upload2 = nock('https://remote.s3.amazonaws.com:443')
        .put('/local-only.gif', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var upload3 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var put_manifest = nock('https://remote.s3.amazonaws.com:443')
        .put('/.pony-manifest', function(body) {
          return (body.hasOwnProperty('local-only.gif') &&
                  body.hasOwnProperty('loveisall.jpg') &&
                  body.hasOwnProperty('loveisall2.jpg'));
        })
        .reply(200, '');

      this.bucket.push().then(function() {
        remote_manifest.done();
        list.done();
        del.done();
        upload1.done();
        upload2.done();
        upload3.done();
        put_manifest.done();
        done();
      }, done).done();
    });

    it('clears the remote manifest if something fails', function(done) {
      var remote_manifest = nock('https://remote.s3.amazonaws.com:443')
        .get('/.pony-manifest')
        .reply(404);

      var list = nock('https://remote.s3.amazonaws.com:443')
        .get('/')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>');

      var del = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')

      var upload1 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall2.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var upload2 = nock('https://remote.s3.amazonaws.com:443')
        .put('/local-only.gif', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var upload3 = nock('https://remote.s3.amazonaws.com:443')
        .put('/loveisall.jpg', '\b\u0006\u0007\u0005\u0003\u0000\t')
        .reply(200, '');

      var put_manifest = nock('https://remote.s3.amazonaws.com:443')
        .put('/.pony-manifest', function() { return true; })
        .reply(404);

      var del_manifest = nock('https://remote.s3.amazonaws.com:443')
        .post('/?delete', '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>.pony-manifest</Key></Object></Delete>')
        .reply(200, '<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>.pony-manifest</Key></Deleted></DeleteResult>')

      this.bucket.push().then(function() {
        remote_manifest.done();
        list.done();
        del.done();
        upload1.done();
        upload2.done();
        upload3.done();
        put_manifest.done();
        del_manifest.done();
        done();
      }, done).done();
    });

  });

});