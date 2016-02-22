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
      var fetch = nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .reply(200, 'bitsbitsbits');

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        res.toString().should.be.exactly('bitsbitsbits');
        fetch.done();
        done();
      }, done).done();
    });

    it('ignores HTTP errors', function(done) {
      var fetch = nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .reply(500);

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        res.toString().should.be.exactly('');
        fetch.done();
        done();
      }, done).done();
    });

    it('handles application level errors', function(done) {
      var fetch = nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .reply(200, {error: 'doh'});

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('doh 1/files/auto//albums/1989/style.mp3');
        fetch.done();
        done();
      }).done();
    });

    it('handles network errors', function(done) {
      var fetch = nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto//albums/1989/style.mp3')
        .replyWithError('Network Failure');

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('Network Failure');
        fetch.done();
        done();
      }).done();
    });

  });

  describe('delta()', function() {

    it('makes a delta request with an empty cursor', function(done) {
      var delta = nock('https://api.dropbox.com:443', {"encodedQueryParams":true})
        .post('/1/delta')
        .reply(200, {has_more: false, entries: [1, 2, 3]});

      this.dropbox.delta().then(function(res) {
        res.entries.should.have.length(3);
        delta.done();
        done();
      }, done).done();;
    });

    it('handles application level errors', function(done) {
      var delta = nock('https://api.dropbox.com:443', {"encodedQueryParams":true})
        .post('/1/delta')
        .reply(401, {error: 'bloop'});

      this.dropbox.delta().then(function(res) {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('bloop');
        delta.done();
        done();
      }).done();
    });

    it('makes a delta request with a cursor', function(done) {
      var delta = nock('https://api.dropbox.com:443', {"encodedQueryParams":true})
        .post('/1/delta', 'cursor=1989')
        .reply(200, {has_more: false, entries: [1, 2, 3]});

      this.dropbox.delta(1989).then(function(res) {
        res.entries.should.have.length(3);
        delta.done();
        done();
      }, done).done();;
    });

    it('unpages a many delta requests', function(done) {
      var page1 = nock('https://api.dropbox.com:443', {"encodedQueryParams":true})
        .post('/1/delta', 'cursor=1989')
        .reply(200, {has_more: true, entries: [1, 2, 3]});

      var page2 = nock('https://api.dropbox.com:443', {"encodedQueryParams":true})
        .post('/1/delta', 'cursor=1989')
        .reply(200, {has_more: true, entries: [4, 5]});

      var page3 = nock('https://api.dropbox.com:443', {"encodedQueryParams":true})
        .post('/1/delta', 'cursor=1989')
        .reply(200, {has_more: false, entries: [6]});

      this.dropbox.delta(1989).then(function(res) {
        res.entries.should.have.length(6);
        page1.done();
        page2.done();
        page3.done();
        done();
      }, done).done();;
    });

  });

  describe('sync_file()', function() {

    before(function() {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': 2});
    });

    it('pulls a file off the network and saves it to disk', function(done) {
      var sync = nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto/albums/1989/style.mp3')
        .reply(200, 'we never go out of style');

      this.dropbox.sync_file(['albums/1989/style.mp3']).then(function() {
        fs.readFile('local/albums/1989/style.mp3', function(err, content) {
          if(err) { done(err); }
          content.toString().should.be.exactly('we never go out of style');
          sync.done();
          done();
        })
      }, done).done();
    });

  });

  describe('sync_folder_or_delete()', function() {

    before(function() {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': 2});
    });

    it('deletes folders locally', function(done) {
      this.dropbox.sync_folder_or_delete(['albums/1989', null]).then(function(res) {
        fs.readdir('local/albums', function(err, files) {
          if(err) { done(err); }
          files.should.have.length(0);
          done();
        });
      }, done).done();;
    });

    it('creates folders locally', function(done) {
      this.dropbox.sync_folder_or_delete(['albums/in-rainbows', {}]).then(function(res) {
        fs.readdir('local/albums/in-rainbows', function(err, files) {
          if(err) { done(err); }
          files.should.have.length(0);
          done();
        });
      }, done).done();;
    });

    it('resets folders locally', function(done) {
      this.dropbox.sync_folder_or_delete(['albums/1989', {}]).then(function(res) {
        fs.readdir('local/albums/1989', function(err, files) {
          if(err) { done(err); }
          files.should.have.length(0);
          done();
        });
      }, done).done();;
    });

  });

  describe('sync_entries()', function() {

    before(function() {
      mockfs({
        'local/albums/1989/out-of-the-woods.mp3': '2',
        'local/albums/taylor-swift/red/trouble.mp3': '3'
      });
    });

    it('syncs a list of entries', function(done) {
      var nude = nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto/albums/radiohead/in-rainbows/nude.mp3')
        .reply(200, 'dont get any big ideas');

      var trouble = nock('https://api-content.dropbox.com:443', {"encodedQueryParams":true})
        .get('/1/files/auto/albums/taylor-swift/red/trouble.mp3')
        .reply(200, 'i knew you were trouble');

      this.dropbox.sync_entries({cursor: 1989, entries: [
        ['albums/radiohead/in-rainbows/nude.mp3', {is_dir: false}],
        ['albums/1989', null],
        ['albums/radiohead/in-rainbows', {is_dir: true}],
        ['albums/radiohead/amnesiac', {is_dir: true}],
        ['albums/grizzly-bear/veckatimest', {is_dir: true}],
        ['albums/1989/style.mp3', null],
        ['albums/taylor-swift/red/trouble.mp3', {is_dir: false}]
      ]}).then(function(res) {
        res.should.be.exactly(1989);
        fs.readdir('local/albums', assertAlbums);

        function assertAlbums(err, files) {
          if(err) { done(err); }
          files.should.containEql('radiohead');
          files.should.containEql('grizzly-bear');
          files.should.containEql('taylor-swift');
          files.should.have.length(3);
          fs.readFile('local/albums/radiohead/in-rainbows/nude.mp3', assertRadiohead);
        }

        function assertRadiohead(err, content) {
          if(err) { done(err); }
          content.toString().should.be.exactly('dont get any big ideas')
          nude.done();
          fs.readFile('local/albums/taylor-swift/red/trouble.mp3', assertTaylor);
        }

        function assertTaylor(err, content) {
          if (err) { done(err); }
          content.toString().should.be.exactly('i knew you were trouble')
          trouble.done();
          done();
        }

      }, done).done();
    });

  });

});