var should = require('should');
var fs = require('fs');
var path = require('path');
var url = require('url');
var app = require('../app');
var request = require('supertest');
var crypto = require('crypto');
var config = require('../config');
var rmdir = require('rimraf');
var mkdirp = require('mkdirp');
var qs = require('querystring');
var { http, helpers: { res, match } } = require('wirepig');

const port = (u) => parseInt(url.parse(u).port);

describe('App', function() {

  before(async function() {
    this.dropbox_api = await http({ port: port(config.dropbox_api_origin) });
    this.dropbox_content = await http({ port: port(config.dropbox_content_origin) });
    this.s3 = await http({ port: port(config.s3_origin) });
  });

  afterEach(function() {
    this.dropbox_api.reset();
    this.dropbox_content.reset();
    this.s3.reset();
  });

  after(async function() {
    await this.dropbox_api.teardown();
    await this.dropbox_content.teardown();
    await this.s3.teardown();
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
          parsed.pathname.should.be.exactly('/oauth2/authorize');
          should(query.client_id).is.a.String;
          should(query.response_type).equal('code');
          should(query.redirect_uri).equal('http://localhost:3000/authorize/redirect');
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

      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/oauth2/token',
          body: match.form({
            'client_id': 'key',
            'client_secret': 'secret',
            'code': '1234',
            'grant_type': 'authorization_code',
            'redirect_uri': 'http://localhost:3000/authorize/redirect'
          }),
        },
        res: res.json({uid: uid, access_token: access_token}),
      });

      this.s3.mock({
        req: {
          method: 'PUT',
          pathname: `/dropbox-keys/${uid}`,
          body: 'access_token'
        },
        res: { statusCode: 200 }
      });

      request(app)
        .get('/authorize/redirect?code=' + code)
        .expect(200, done);
    });
  });

  describe('GET /authorize/redirect', function () {
    it('throws if there is an error with dropbox', function(done) {

      var code = '1234';
      this.dropbox_api.mock({
        req: { method: 'POST', pathname: '/oauth2/token' },
        res: res.json(
          {error: 500, error_description: 'Nope'},
          { statusCode: 500 }
        ),
      });

      request(app)
        .get('/authorize/redirect?code=' + code)
        .expect(500, done);
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
      var payload = {list_folder: {accounts: []}};
      var buf = JSON.stringify(payload)
      var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

      request(app)
        .post('/deploy')
        .send(payload)
        .set('X-DROPBOX-SIGNATURE', hmac.digest('hex'))
        .expect(500, done);
    });

    it('accepts a single user id', function(done) {
      var payload = {list_folder: {accounts: [1]}};
      var buf = JSON.stringify(payload)
      var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

      request(app)
        .post('/deploy')
        .send(payload)
        .set('X-DROPBOX-SIGNATURE', hmac.digest('hex'))
        .expect(200, done);
    });

    it('accepts a many user ids', function(done) {
      var payload = {list_folder: {accounts: [1, 2, 3]}};
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

      this.s3.mock({
        req: { method: 'GET', pathname: '/dropbox-keys/taylor' },
        res: res.text('taylor-dropbox-key'),
      })

      this.dropbox_api.mock({
        req: { method: 'POST', pathname: '/2/files/list_folder/continue', body: match.json({cursor: '1989'}) },
        res: res.json({
          cursor: '1989',
          has_more: false,
          entries: [
            {path_lower: '/index.md', '.tag': 'file'},
            {path_lower: '/albums/1989.md', '.tag': 'file'},
            {path_lower: '/albums', '.tag': 'folder'}
          ]
        })
      })

      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/index.md"}'},
        },
        res: res.text('---\ntemplate: layout\n---\n\n# Taylor Swift\n')
      });

      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/1989.md"}'},
        },
        res: res.text('---\nlayout: layout\n---\n\n*1989*')
      });

      this.s3.mock({
        req: { method: 'GET', pathname: '/taylorswift.com/.pony-manifest' },
        res: res.json({'index.html': '30972b7f137ade34641c799cf377c6a17ad84bba'})
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/taylorswift.com/albums/1989.html' },
      });

      this.s3.mock({
        req: { method: 'PUT', pathname: '/taylorswift.com/.pony-manifest' },
      });

      this.s3.mock({
        req: {
          method: 'POST',
          pathname: '/taylorswift.com',
          query: '?delete',
          body: '<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>_error/index.html</Key></Object></Delete>'
        },
      });

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
              done(err);
            });
          });
        });
    });

    it('reports an error if the build fails', function(done) {

      this.s3.mock({
        req: { method: 'GET', pathname: '/dropbox-keys/taylor' },
        res: { statusCode: 404 }
      })

      this.s3.mock({
        req: { method: 'PUT', pathname: `/taylorswift.com/${config.error_path}` },
      })

      request(app)
        .post('/deploy/sync')
        .send({id: 'taylor'})
        .expect(200, done);
    });

    it('reports an error if both the build fails and ErrorReporter fails', function(done) {

      this.s3.mock({
        req: { method: 'GET', pathname: '/dropbox-keys/taylor' },
        res: { statusCode: 404 }
      })

      this.s3.mock({
        req: { method: 'PUT', pathname: `/taylorswift.com/${config.error_path}` },
        res: { statusCode: 404 }
      })

      request(app)
        .post('/deploy/sync')
        .send({id: 'taylor'})
        .expect(200, done);
    });

  });

});

