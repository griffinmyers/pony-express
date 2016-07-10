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

  afterEach(mockfs.restore);

  describe('cursor()', function() {

    beforeEach(function() {
      mockfs({
        'local/.pony-token': '1989'
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

    beforeEach(function() {
      mockfs({ 'local': {} });
    });

    it('saves a cursor to disk', function(done) {
      this.dropbox.save_cursor('1989').then(function() {
        fs.readFile('local/.pony-token', function(err, content) {
          if (err) { done(err); }
          content.toString().should.be.exactly('1989');
          done();
        });
      }, done).done();
    });

  });

  describe('delete_cursor()', function() {

    beforeEach(function() {
      mockfs({
        'local/.pony-token': '1989',
        'tmp': {}
      });
    });

    it('deletes a cursor on disk', function(done) {
      this.dropbox.delete_cursor().then(function() {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(0);
          done();
        });
      }, done).done();
    });

    it('ignores a cursor that doesn\'t exist', function(done) {
      new Dropbox('access_key', 'tmp').delete_cursor().then(function() {
        fs.readdir('tmp', function(err, files) {
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
      Q(this.dropbox.maybe_reset()).then(function(res) {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(0);
          should.not.exist(res);
          done();
        });
      }, done).done();
    });

    it('doesn\'t reset a local directory', function(done) {
      Q(this.dropbox.maybe_reset('cursor')).then(function(res) {
        fs.readdir('local', function(err, files) {
          if (err) { done(err); }
          files.should.have.length(3);
          res.should.equal('cursor');
          done();
        });
      }, done).done();
    });

  });

  describe('fetch_file()', function() {

    it('makes a network request for a file', function(done) {
      var fetch = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        })
        .get('/2/files/download')
        .reply(200, 'bitsbitsbits');

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        res.toString().should.be.exactly('bitsbitsbits');
        fetch.done();
        done();
      }, done).done();
    });

    it('handles HTTP errors', function(done) {
      var fetch = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        })
        .get('/2/files/download')
        .reply(500);

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        done('Should have failed.');
      }, function(reason) {
        fetch.done();
        done();
      }).done();
    });

    it('handles application level errors', function(done) {
      var fetch = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        })
        .get('/2/files/download')
        .reply(200, {error: 'doh'});

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function() {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('doh /2/files/download');
        fetch.done();
        done();
      }).done();
    });

    it('handles network errors', function(done) {
      var fetch = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        })
        .get('/2/files/download')
        .replyWithError('Network Failure');

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function() {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('Network Failure');
        fetch.done();
        done();
      }).done();
    });

  });

  describe('list_folder()', function() {

    it('makes a list_folder request with an empty cursor', function(done) {
      var list_folder = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder', {path: '', recursive: true})
        .reply(200, {has_more: false, entries: [1, 2, 3]});

      this.dropbox.list_folder().then(function(res) {
        res.entries.should.have.length(3);
        list_folder.done();
        done();
      }, done).done();
    });

    it('will retry given a cursor error by reseting and trying without a cursor', function(done) {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': 2});

      var list_folder_fail = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder/continue', {cursor: '1989'})
        .reply(401, {error: 'bloop'});

      var list_folder = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder', {path: '', recursive: true})
        .reply(200, {has_more: false, entries: [1, 2, 3]});

      this.dropbox.list_folder('1989').then(function(res) {
        res.entries.should.have.length(3);
        list_folder_fail.done();
        list_folder.done();
        fs.readdir('local', function(err, files) {
          if(err) { done(err); return; }
          files.should.have.length(0);
          mockfs.restore();
          done();
        });
      }, done).done();
    });

    it('handles application level errors', function(done) {
      var list_folder = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder')
        .reply(200, {error: {'.tag': 'bloop'}});

      this.dropbox.list_folder().then(function() {
        done('Should have failed.');
      }, function(reason) {
        list_folder.done();
        done();
      }).done();
    });

    it('handles non-json responses as errors', function(done) {
      var list_folder = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder')
        .reply(200, 'huh?');

      this.dropbox.list_folder().then(function() {
        done('Should have failed.');
      }, function(reason) {
        list_folder.done();
        done();
      }).done();
    });

    it('makes a list_folder request with a cursor', function(done) {
      var list_folder = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder/continue', {cursor: '1989'})
        .reply(200, {has_more: false, entries: [1, 2, 3]});

      this.dropbox.list_folder('1989').then(function(res) {
        res.entries.should.have.length(3);
        list_folder.done();
        done();
      }, done).done();
    });

    it('unpages a many list_folder requests', function(done) {
      var page1 = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder', {path: '', recursive: true})
        .reply(200, {has_more: true, entries: [1, 2, 3], cursor: '1'});

      var page2 = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder/continue', {cursor: '1'})
        .reply(200, {has_more: true, entries: [4, 5], 'cursor': '2'});

      var page3 = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder/continue', {cursor: '2'})
        .reply(200, {has_more: false, entries: [6]});

      this.dropbox.list_folder().then(function(res) {
        res.entries.should.have.length(6);
        page1.done();
        page2.done();
        page3.done();
        done();
      }, done).done();
    });

  });

  describe('sync_file()', function() {

    before(function() {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': 2});
    });

    it('pulls a file off the network and saves it to disk', function(done) {
      var sync = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        })
        .get('/2/files/download')
        .reply(200, 'we never go out of style');

      this.dropbox.sync_file({path_lower: '/albums/1989/style.mp3'}).then(function() {
        fs.readFile('local/albums/1989/style.mp3', function(err, content) {
          if(err) { done(err); return; }
          content.toString().should.be.exactly('we never go out of style');
          sync.done();
          done();
        })
      }, done).done();
    });

  });

  describe('sync_folder()', function() {

    before(function() {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': 2});
    });

    it('creates folders locally', function(done) {
      this.dropbox.sync_folder({path_lower: '/albums/in-rainbows'}).then(function() {
        fs.readdir('local/albums/in-rainbows', function(err, files) {
          if(err) { done(err); return; }
          files.should.have.length(0);
          done();
        });
      }, done).done();
    });

    it('resets folders locally', function(done) {
      this.dropbox.sync_folder({path_lower: 'albums/1989'}).then(function() {
        fs.readdir('local/albums/1989', function(err, files) {
          if(err) { done(err); return; }
          files.should.have.length(0);
          done();
        });
      }, done).done();
    });

  });

  describe('sync_delete()', function() {

    before(function() {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': 2});
    });

    it('deletes folders locally', function(done) {
      this.dropbox.sync_delete({path_lower: 'albums/1989'}).then(function() {
        fs.readdir('local/albums', function(err, files) {
          if(err) { done(err); return; }
          files.should.have.length(0);
          done();
        });
      }, done).done();
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
      var nude = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/radiohead/in-rainbows/nude.mp3"}'}
        })
        .get('/2/files/download')
        .reply(200, 'dont get any big ideas');

      var trouble = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/taylor-swift/red/trouble.mp3"}'}
        })
        .get('/2/files/download')
        .reply(200, 'i knew you were trouble');

      this.dropbox.sync_entries({cursor: '1989', entries: [
        {path_lower: '/albums/radiohead/in-rainbows/nude.mp3', '.tag': 'file'},
        {path_lower: '/albums/1989', '.tag': 'deleted'},
        {path_lower: '/albums/radiohead/in-rainbows', '.tag': 'folder'},
        {path_lower: '/albums/radiohead/amnesiac', '.tag': 'folder'},
        {path_lower: '/albums/grizzly-bear/veckatimest', '.tag': 'folder'},
        {path_lower: '/albums/1989/style.mp3', '.tag': 'deleted'},
        {path_lower: '/albums/taylor-swift/red/trouble.mp3', '.tag': 'file'}
      ]}).then(function(res) {
        res.should.be.exactly('1989');
        fs.readdir('local/albums', assertAlbums);

        function assertAlbums(err, files) {
          if(err) { done(err); return; }
          files.should.containEql('radiohead');
          files.should.containEql('grizzly-bear');
          files.should.containEql('taylor-swift');
          files.should.have.length(3);
          fs.readFile('local/albums/radiohead/in-rainbows/nude.mp3', assertRadiohead);
        }

        function assertRadiohead(err, content) {
          if(err) { done(err); return; }
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

  describe('sync()', function() {

    beforeEach(function() {
      mockfs({
        'local/albums/taylor-swift/red/trouble.mp3': '3'
      });
    });

    it('syncs', function(done) {

      var page1 = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder', {path: '', recursive: true})
        .reply(200, {cursor: '1990', has_more: true, entries: [
          {path_lower: '/albums/radiohead/in-rainbows/nude.mp3', '.tag': 'file'},
          {path_lower: '/albums/1989', '.tag': 'deleted'},
          {path_lower: '/albums/radiohead/in-rainbows', '.tag': 'folder'},
          {path_lower: '/albums/radiohead/amnesiac', '.tag': 'folder'}
        ]});

      var page2 = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder/continue', {cursor: '1990'})
        .reply(200, {cursor: '1991', has_more: false, entries: [
          {path_lower: '/albums/grizzly-bear/veckatimest', '.tag': 'folder'},
          {path_lower: '/albums/taylor-swift/red', '.tag': 'folder'},
          {path_lower: '/albums/1989/style.mp3', '.tag': 'deleted'},
          {path_lower: '/albums/taylor-swift/red/trouble.mp3', '.tag': 'file'}
        ]});

      var nude = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/radiohead/in-rainbows/nude.mp3"}'}
        })
        .get('/2/files/download')
        .reply(200, 'dont get any big ideas');

      var trouble = nock('https://content.dropboxapi.com:443', {
          reqheaders: {'Dropbox-API-Arg': '{"path":"/albums/taylor-swift/red/trouble.mp3"}'}
        })
        .get('/2/files/download')
        .reply(200, 'i knew you were trouble');

      this.dropbox.sync().then(function() {
        fs.readFile('local/.pony-token', function(err, content) {
          if(err) { done(err); return; }
          content.toString().should.be.exactly('1991');
          done();
        });

        page1.done();
        page2.done();
        nude.done();
        trouble.done();
      }, done).done();
    });

    it('deletes the cursor if anything breaks', function(done) {

      var list_folder = nock('https://api.dropboxapi.com:443')
        .post('/2/files/list_folder')
        .replyWithError('doh');

      this.dropbox.sync().then(function() {
        done('Should not have resolved.');
      }, function(reason) {
        fs.readFile('local/.pony-token', function(err) {
          reason.message.should.be.exactly('doh');
          if(err) { done(); return; }
          done('Cursor should have been deleted.');
        });

        list_folder.done();
      }).done();
    });

  });

});