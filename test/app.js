require('should');
var fs = require('fs');
var path = require('path');
var url = require('url');
var app = require('../app');
var request = require('supertest');
var qs = require('querystring');
var nock = require('nock');
var crypto = require('crypto');
var config = require('../config');
var rmdir = require('rimraf');
var mkdirp = require('mkdirp');

describe('App', function() {

  before(function() {
    nock.enableNetConnect('127.0.0.1');
  });

  after(function() {
    nock.cleanAll();
    nock.disableNetConnect();
  })

  describe('GET /', function(){
    it('responds', function(done){
      request(app)
        .get('/')
        .expect(200, done);
    });
  });

  describe('GET /authorize', function(){
    it('redirects', function(done){
      request(app)
        .get('/authorize')
        .expect(function(res) {
          var parsed = url.parse(res.headers.location);
          var query = qs.parse(parsed.query);

          parsed.hostname.should.be.exactly('dropbox.com');
          parsed.protocol.should.be.exactly('https:');
          parsed.pathname.should.be.exactly('/1/oauth2/authorize');
          query.should.have.property('client_id').which.is.a.String;
          query.should.have.property('response_type', 'code');
          query.should.have.property('redirect_uri', 'http://localhost:3000/authorize/redirect');
        })
        .expect(302, done);
    });
  });

  describe('GET /authorize/redirect', function () {
    it('makes the auth call to dropbox and stores the key', function(done) {
      var secret = 'secret';
      var key = 'key';
      var code = '1234';
      var uid = 1296;
      var access_token = 'access_token';

      process.env.DROPBOX_APP_KEY = key;
      process.env.DROPBOX_APP_SECRET = secret;

      var dropbox = nock('https://api.dropbox.com')
        .post('/1/oauth2/token', function(body) {
          if(body.client_id === key &&
             body.client_secret === secret &&
             body.code === code &&
             body.grant_type === 'authorization_code' &&
             body.redirect_uri === 'http://localhost:3000/authorize/redirect') {
            return true;
          }
        })
        .reply(200, {uid: uid, access_token: access_token});

      var s3 = nock('https://dropbox-keys.s3.amazonaws.com')
        .put('/' + uid , function(body) {
          return body === access_token;
        })
        .reply(200);

      request(app)
        .get('/authorize/redirect?code=' + code)
        .expect(200, function(err) {
          dropbox.done();
          s3.done();
          done(err);
        });
    });
  });

  describe('GET /authorize/redirect', function () {
    it('throws if there is an error with dropbox', function(done) {

      var code = '1234';
      var dropbox = nock('https://api.dropbox.com')
        .post('/1/oauth2/token')
        .reply(500, {error: 500, error_description: 'Nope'});

      request(app)
        .get('/authorize/redirect?code=' + code)
        .expect(500, function(err) {
          dropbox.done();
          done(err);
        });
    });
  });

  describe('GET /deploy', function() {
    it('needs a challenge token', function(done) {
      request(app)
        .get('/deploy')
        .query({challenge: 'taylor-swift'})
        .expect(200, function(err, body) {
          body.text.should.be.exactly('taylor-swift');
          done(err);
        });
    })
  });

  describe('POST /deploy', function() {

    beforeEach(function() {
      this.secret = process.env.DROPBOX_APP_SECRET
      process.env.DROPBOX_APP_SECRET = 'secret';
    });

    afterEach(function() {
      process.env.DROPBOX_APP_SECRET = this.secret;
      delete this.secret;
    });

    it('requires a valid dropbox signature', function(done) {
      request(app)
        .post('/deploy')
        .send({mac: 'demarco'})
        .expect(403, done);
    });

    it('passes through to the controller with a valid signature', function(done) {
      var payload = {mac: 'demarco'};
      var buf = JSON.stringify(payload)
      var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

      request(app)
        .post('/deploy')
        .send(payload)
        .set('X-DROPBOX-SIGNATURE', hmac.digest('hex'))
        .expect(500, done);
    });

    it('needs a user id', function(done) {
      var payload = {delta: {users: []}};
      var buf = JSON.stringify(payload)
      var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

      request(app)
        .post('/deploy')
        .send(payload)
        .set('X-DROPBOX-SIGNATURE', hmac.digest('hex'))
        .expect(500, done);
    });

    it('accepts a single user id', function(done) {
      var payload = {delta: {users: [1]}};
      var buf = JSON.stringify(payload)
      var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

      request(app)
        .post('/deploy')
        .send(payload)
        .set('X-DROPBOX-SIGNATURE', hmac.digest('hex'))
        .expect(200, done);
    });

    it('accepts a many user ids', function(done) {
      var payload = {delta: {users: [1, 2, 3]}};
      var buf = JSON.stringify(payload)
      var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

      request(app)
        .post('/deploy')
        .send(payload)
        .set('X-DROPBOX-SIGNATURE', hmac.digest('hex'))
        .expect(200, done);
    });

  });

  describe('POST /deploy/sync', function() {

    before(function(done) {
      rmdir('src/taylor', function() {
        mkdirp('src/taylor/_code/templates', function() {
          fs.writeFile('src/taylor/.pony-token', '1989', function() {
            fs.writeFile('src/taylor/_code/templates/layout.jade', '#page\n  != contents\n', done);
          });
        });
      });

      config.users.taylor = {
        bucket: 'taylorswift.com',
        middleware: function(source) {
          return [
            {name: 'markdown', args: {gfm: true, tables: true, breaks: false, pedantic: false, sanitize: false, smartLists: true, smartypants: true}},
            {name: 'bind_template'},
            {name: 'invalid_middlware'},
            {name: 'partial'},
            {name: 'layouts', args: {engine: 'jade', directory: path.join(source, '_code', 'templates')}},
            {name: 'clean', args: '_code'},
            {name: 'clean', args: '.pony-token'}
          ];
        }
      };
    });

    after(function(done) {
      delete config.users.taylor;
      rmdir('src/taylor', done);
    });

    it('requires a payload', function(done) {
      request(app)
        .post('/deploy/sync')
        .expect(500, done);
    });

    it('requires a user id', function(done) {
      request(app)
        .post('/deploy/sync')
        .send({mac: 'demarco'})
        .expect(500, done);
    });

    it('requires a valid user id', function(done) {
      request(app)
        .post('/deploy/sync')
        .send({id: 2})
        .expect(500, done);
    });

    it('deploys with a valid user id', function(done) {

      var key = nock('https://dropbox-keys.s3.amazonaws.com:443')
        .get('/taylor')
        .reply(200, 'taylor-dropbox-key');

      var delta = nock('https://api.dropbox.com:443')
        .post('/1/delta', 'cursor=1989')
        .reply(200, {cursor: 1989, has_more: false, entries: [
          ['index.md', {is_dir: false}],
          ['albums/1989.md', {is_dir: false}],
          ['albums', {is_dir: true}]
        ]});

      var index = nock('https://api-content.dropbox.com:443')
        .get('/1/files/auto/index.md')
        .reply(200, '---\ntemplate: layout\n---\n\n# Taylor Swift\n');

      var album = nock('https://api-content.dropbox.com:443')
        .get('/1/files/auto/albums/1989.md')
        .reply(200, '---\nlayout: layout\n---\n\n*1989*');

      var manifest = nock('https://s3.amazonaws.com:443')
        .get('/taylorswift.com/.pony-manifest')
        .reply(200, {'index.html': '30972b7f137ade34641c799cf377c6a17ad84bba'});

      var album_upload = nock('https://s3.amazonaws.com:443')
        .put('/taylorswift.com/albums/1989.html')
        .reply(200, '');

      var put_manifest = nock('https://s3.amazonaws.com:443')
        .put('/taylorswift.com/.pony-manifest')
        .reply(200);

      var clear_error = nock('https://s3.amazonaws.com:443')
        .post('/taylorswift.com?delete', /Delete/)
        .reply(200, '');

      request(app)
        .post('/deploy/sync')
        .send({id: 'taylor'})
        .expect(200, function(err) {
          fs.readdir('build/taylor', function(e, files) {
            if(e) { done(e); return; }
            files.should.have.length(2);
            fs.readFile('build/taylor/index.html', function(f, content) {
              if(f) { done(f); return; }
              content.toString().should.be.exactly('<div id="page"><h1 id="taylor-swift">Taylor Swift</h1>\n</div>');
              key.done();
              delta.done();
              index.done();
              album.done();
              manifest.done();
              album_upload.done();
              put_manifest.done();
              clear_error.done();
              done(err);
            });
          });
        });
    });

    it('reports an error if the build fails', function(done) {

      var key = nock('https://dropbox-keys.s3.amazonaws.com:443')
        .get('/taylor')
        .reply(404)

      var set_error = nock('https://s3.amazonaws.com:443')
        .put('/taylorswift.com/' + config.error_path)
        .reply(200);

      request(app)
        .post('/deploy/sync')
        .send({id: 'taylor'})
        .expect(200, function(err) {
          if(err) { done(err); return; }
          key.done();
          set_error.done();
          done(err);
        });

    });

  });

});

