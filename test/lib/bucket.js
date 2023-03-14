require('should');
var url = require('url');
var config = require('../../config');
var Bucket = require('../../lib/bucket.js');
var mockfs = require('mock-fs');
var { http, helpers: { res, match } } = require('wirepig');

const port = (u) => parseInt(url.parse(u).port);

describe('Bucket', function() {
  before(async function() {
    this.bucket = new Bucket('local', 'remote', config.s3_origin);
    this.s3 = await http({ port: port(config.s3_origin) });
  });

  afterEach(function() {
    this.s3.reset();
  });

  after(async function() {
    mockfs.restore();
    await this.s3.teardown();
  })

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

      this.s3.mock({
        req: { method: 'GET', pathname: '/remote/.pony-manifest' },
        res: res.json(expect)
      })

      this.bucket.get_remote_manifest().then(function(manifest) {
        manifest.should.have.property('dir/runner.txt', expect['dir/runner.txt']);
        manifest.should.have.property('loveisall.jpg', expect['loveisall.jpg']);
        done();
      }, done).done();
    });
  });

  describe('list()', function() {
    it('lists the contents of a bucket', function(done) {
      this.s3.mock({
        req: { method: 'GET', pathname: '/remote' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>the-runner.txt</Key><LastModified>2015-04-08T02:11:10.000Z</LastModified><ETag>&quot;07acbec5291bd4c8bc1a6ead516c137e&quot;</ETag><Size>2126</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>burried/by/the/dasies.html</Key><LastModified>2015-03-26T08:19:29.000Z</LastModified><ETag>&quot;6b3ce9a3e306d8bd2baeb048f9f43d6b&quot;</ETag><Size>392</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>')
      })

      this.bucket.list().then(function(res) {
        res.should.eql(['the-runner.txt', 'burried/by/the/dasies.html']);
        done();
      }, done).done();
    });
  });

  describe('put_remote_manifest()', function() {
    it('puts the manifest', function(done) {
      var manifest = {'a':1,'b': 2};

      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: '/remote/.pony-manifest',
          body: match.json(manifest)
        }
      });

      this.bucket.put_remote_manifest(manifest).then(function() {
        done();
      }, done).done();
    });
  });

  describe('del()', function() {
    it('deletes files', function(done) {
      var files = ['a/b.html', 'c.json'];

      this.s3.mock({
        req: {
          method: 'POST',
          pathname: '/remote',
          query: '?delete',
          body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>a/b.html</Key></Object><Object><Key>c.json</Key></Object></Delete>'
        },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?><DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>c.json</Key></Deleted><Deleted><Key>a/b.html</Key></Deleted></DeleteResult>')
      });

      this.bucket.del(files).then(function(res) {
        res.should.have.property('Deleted');
        res.should.have.property('Errors');
        res.Errors.should.be.empty;
        done();
      }, done).done();
    });

    it('deletes a file', function(done) {
      var files = 'a/b.html';

      this.s3.mock({
        req: {
          method: 'POST',
          pathname: '/remote',
          query: '?delete',
          body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>a/b.html</Key></Object></Delete>'
        },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?><DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>a/b.html</Key></Deleted></DeleteResult>')
      });

      this.bucket.del(files).then(function(res) {
        res.should.have.property('Deleted');
        res.should.have.property('Errors');
        res.Errors.should.be.empty;
        done();
      }, done).done();
    });

    it('short-circuits with nothing to delete', function(done) {
      this.bucket.del([]).then(function() {
        done();
      }, done).done();
    });
  });

  describe('upload_path()', function() {
    before(function() {
      mockfs({'local/loveisall.jpg': new Buffer([8, 6, 7, 5, 3, 0, 9])});
    });

    it('uploads from a path with a guessed mimetype', function(done) {
      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: '/remote/loveisall.jpg',
          body: new Buffer([8, 6, 7, 5, 3, 0, 9])
        }
      });

      this.bucket.upload_path('loveisall.jpg').then(function(res) {
        res.should.have.property('Location');
        done();
      }, done).done();
    });
  });

  describe('upload()', function() {

    it('uploads with passed key, contents, and mimetype', function(done) {
      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: '/remote/a/b.html',
          body: '<div></div>'
        }
      });

      this.bucket.upload('a/b.html', '<div></div>', 'html').then(function(res) {
        res.should.have.property('Location');
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
      this.s3.mock({
        req: { method: 'GET', pathname: '/remote' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>')
      });

      this.s3.mock({
        req: { method: 'POST', pathname: '/remote', query: '?delete', body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall2.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.bucket.upload_all({'loveisall.jpg': 1, 'loveisall2.jpg': 2}).then(function() {
        done();
      }, done).done();
    });

  });

  describe('clear()', function() {
    it('clears everything from a bucket', function(done) {
      this.s3.mock({
        req: { method: 'GET', pathname: '/remote' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>')
      });

      this.s3.mock({
        req: { method: 'POST', pathname: '/remote', query: '?delete', body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')
      });

      this.bucket.clear().then(function() {
        done();
      }, done).done();
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
      this.s3.mock({
        req: { method: 'POST', pathname: '/remote', query: '?delete', body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>remote-only.gif</Key></Object></Delete>' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>remote-only.gif</Key></Deleted></DeleteResult>')
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall2.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/local-only.gif', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      var remote = {'loveisall.jpg': 1, 'loveisall2.jpg': 2, 'remote-only.gif': 4};
      var local = {'loveisall.jpg': 1, 'loveisall2.jpg': 3, 'local-only.gif': 5};

      this.bucket.upload_diff(remote, local).then(function() {
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
      this.s3.mock({
        req: { method: 'GET', pathname: '/remote/.pony-manifest' },
        res: res.json({
          'loveisall.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93',
          'loveisall2.jpg': 2,
          'remote-only.gif': 4
        })
      });

      this.s3.mock({
        req: { method: 'POST', pathname: '/remote', query: '?delete', body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>remote-only.gif</Key></Object></Delete>' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>remote-only.gif</Key></Deleted></DeleteResult>')
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall2.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/local-only.gif', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: '/remote/.pony-manifest',
          body: match.json({
            'local-only.gif': '994a799d745100869cc0aaf2c09d2602d44b1c93',
            'loveisall.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93',
            'loveisall2.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93'
          })
        },
      });

      this.bucket.push().then(function() {
        done();
      }, done).done();

    });

    it('uploads everything if there was a problem getting the remote manifest', function(done) {
      this.s3.mock({
        req: { method: 'GET', pathname: '/remote/.pony-manifest' },
        res: { statusCode: 404 }
      })

      this.s3.mock({
        req: { method: 'GET', pathname: '/remote' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>')
      });

      this.s3.mock({
        req: { method: 'POST', pathname: '/remote', query: '?delete', body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall2.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/local-only.gif', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: '/remote/.pony-manifest',
          body: match.json({
            'local-only.gif': '994a799d745100869cc0aaf2c09d2602d44b1c93',
            'loveisall.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93',
            'loveisall2.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93'
          })
        },
      });

      this.bucket.push().then(function() {
        done();
      }, done).done();
    });

    it('clears the remote manifest if something fails', function(done) {
      this.s3.mock({
        req: { method: 'GET', pathname: '/remote/.pony-manifest' },
        res: { statusCode: 404 }
      })

      this.s3.mock({
        req: { method: 'GET', pathname: '/remote' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>remote</Name><Prefix></Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>index.html</Key></Contents><LastModified>2015-04-08T13:03:10.000Z</LastModified><ETag>&quot;58f62302b2e54b69f00360b0e84d6796&quot;</ETag><Size>940</Size><Owner><ID>65b749052bb8ea4df26271b212f78201abc29c23daaba7a05dc418f7fb5d053b</ID><DisplayName>griffin.myers</DisplayName></Owner><StorageClass>STANDARD</StorageClass></ListBucketResult>')
      });

      this.s3.mock({
        req: { method: 'POST', pathname: '/remote', query: '?delete', body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>index.html</Key></Object></Delete>' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>index.html</Key></Deleted></DeleteResult>')
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall2.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/local-only.gif', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/remote/loveisall.jpg', body: new Buffer([8, 6, 7, 5, 3, 0, 9]) },
      });

      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: '/remote/.pony-manifest',
          body: match.json({
            'local-only.gif': '994a799d745100869cc0aaf2c09d2602d44b1c93',
            'loveisall.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93',
            'loveisall2.jpg': '994a799d745100869cc0aaf2c09d2602d44b1c93'
          })
        },
        res: { statusCode: 404 }
      });

      this.s3.mock({
        req: { method: 'POST', pathname: '/remote', query: '?delete', body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>.pony-manifest</Key></Object></Delete>' },
        res: res.text('<?xml version="1.0" encoding="UTF-8"?>\n<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Deleted><Key>.pony-manifest</Key></Deleted></DeleteResult>')
      });

      this.bucket.push().then(function() {
        done();
      }, done).done();
    });

  });

});
