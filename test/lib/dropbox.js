var should = require('should');
var nock = require('nock');
var mockfs = require('mock-fs');
var Dropbox = require('../../lib/dropbox.js');
var fs = require('fs');
var Q = require('q');

describe('Dropbox', function() {

  beforeEach(function() {
    this.dropbox = new Dropbox('access_key', 'local');
  });

  after(mockfs.restore);

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

  describe('save_cursor()', function() {

    it('saves a cursor to disk', function(done) {
      this.dropbox.save_cursor('1989').then(function(res) {
        fs.readFile('local/.pony-token', function(err, content) {
          if (err) { done(err); }
          content.toString().should.be.exactly('1989');
          done();
        });
      }, done).done();
    });

  });

  describe('delete_cursor()', function() {

    before(function() {
      mockfs({
        'local/.pony-token': '1989',
      });
    });

    it('deletes a cursor on disk', function(done) {
      this.dropbox.delete_cursor().then(function() {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(0);
          done();
        });
      }, done).done();;
    });

    it('deletes happily ignores a cursor that doesn\'t exist', function(done) {
      new Dropbox('access_key', 'tmp').delete_cursor().then(function(res) {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(0);
          done();
        });
      }, done).done();
    });

  });

  describe('reset()', function() {

    before(function() {
      mockfs({
        'local/.pony-token': '1989',
        'local/1/2/3.mp3': 'Ive got a blank space baby',
        'local/1.mp3': 'On videotape on videotape'
      });
    });

    it('resets a local directory', function(done) {
      this.dropbox.reset().then(function() {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(0);
          done();
        });
      }, done).done();
    });

  });

  describe('maybe_reset()', function() {

    beforeEach(function() {
      mockfs({
        'local/.pony-token': '1989',
        'local/1/2/3.mp3': 'Ive got a blank space baby',
        'local/1.mp3': 'On videotape on videotape'
      });
    });

    it('resets a local directory', function(done) {
      Q(this.dropbox.maybe_reset({reset: true})).then(function(res) {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(0);
          res.reset.should.be.exactly.true;
          done();
        });
      }, done).done();
    });

    it('doesn\'t reset a local directory', function(done) {
      Q(this.dropbox.maybe_reset({reset: false})).then(function(res) {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(3);
          res.reset.should.be.exactly.false;
          done();
        });
      }, done).done();
    });

  });

  describe('fetch_file()', function() {

    it('makes a network request for a file', function(done) {

      nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .reply(200, 'bitsbitsbits');

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        res.toString().should.be.exactly('bitsbitsbits');
        done();
      }, done).done();
    });

    it('ignores HTTP errors', function(done) {
      nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .reply(500);

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        res.toString().should.be.exactly('');
        done();
      }, done).done();
    });

    it('handles application level errors', function(done) {
      nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .reply(200, {error: 'doh'});

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('doh 1/files/auto//albums/1989/style.mp3');
        done();
      }).done();
    });

    it('handles network errors', function(done) {
      nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .replyWithError('Network Failure');

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('Network Failure');
        done();
      }).done();
    });

  });

});