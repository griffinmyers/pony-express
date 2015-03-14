var url = require('url');
var app = require('../app');
var request = require('supertest');
var should = require('should');
var qs = require('querystring');

describe('App', function() {

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

});

