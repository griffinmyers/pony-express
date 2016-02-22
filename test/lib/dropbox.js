var should = require('should');
var nock = require('nock');
var mockfs = require('mock-fs');
var Dropbox = require('../../lib/dropbox.js');
var fs = require('fs');

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

});