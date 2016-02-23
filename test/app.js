require('should');
var url = require('url');
var app = require('../app');
var request = require('supertest');
var qs = require('querystring');
var nock = require('nock');
var crypto = require('crypto');

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

  describe.only('POST /deploy', function() {
    it('requires a valid dropbox signature', function(done) {
      request(app)
        .post('/deploy')
        .send({mac: 'demarco'})
        .expect(403, done);
    });

    it('passes through to the controller with a valid signature', function(done) {
      var secret = process.env.DROPBOX_APP_SECRET
      process.env.DROPBOX_APP_SECRET = 'secret';

      var payload = {mac: 'demarco'};
      var buf = JSON.stringify(payload)
      var hmac = crypto.createHmac('sha256', process.env.DROPBOX_APP_SECRET).update(buf);

      request(app)
        .post('/deploy')
        .send(payload)
        .set('X-DROPBOX-SIGNATURE', hmac.digest('hex'))
        .expect(500, function(err) {
          done(err);
          process.env.DROPBOX_APP_SECRET = secret;
        });
    });
  });

});

