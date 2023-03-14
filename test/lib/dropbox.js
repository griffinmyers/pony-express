var url = require('url');
var should = require('should');
var mockfs = require('mock-fs');
var config = require('../../config');
var Dropbox = require('../../lib/dropbox.js');
var fs = require('fs');
var Q = require('q');
var { http, helpers: { res, match } } = require('wirepig');

const port = (u) => parseInt(url.parse(u).port);

describe('Dropbox', function() {
  before(async function() {
    this.dropbox_api = await http({ port: port(config.dropbox_api_origin) });
    this.dropbox_content = await http({ port: port(config.dropbox_content_origin) });
  });

  beforeEach(function() {
    this.dropbox = new Dropbox(
      'access_key',
      'local',
      config.dropbox_api_origin,
      config.dropbox_content_origin
    );
  });

  afterEach(function() {
    this.dropbox_api.reset();
    this.dropbox_content.reset();
    mockfs.restore();
  });

  after(async function() {
    await this.dropbox_api.teardown();
    await this.dropbox_content.teardown();
  })

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
      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        },
        res: res.text('bitsbitsbits')
      });

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        res.toString().should.be.exactly('bitsbitsbits');
        done();
      }, done).done();
    });

    it('handles HTTP errors', function(done) {
      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        },
        res: { statusCode: 500 }
      });

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function(res) {
        done('Should have failed.');
      }, function(reason) {
        done();
      }).done();
    });

    it('handles application level errors', function(done) {
      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        },
        res: res.json({error: 'doh'})
      });

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function() {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('doh /2/files/download');
        done();
      }).done();
    });

    it('handles network errors', function(done) {
      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        },
        res: { destroySocket: true }
      });

      this.dropbox.fetch_file('/albums/1989/style.mp3').then(function() {
        done('Should have failed.');
      }, function(reason) {
        reason.message.should.be.exactly('socket hang up');
        done();
      }).done();
    });

  });

  describe('list_folder()', function() {

    it('makes a list_folder request with an empty cursor', function(done) {
      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder',
          body: match.json({path: '', recursive: true})
        },
        res: res.json({has_more: false, entries: [1, 2, 3]})
      });

      this.dropbox.list_folder().then(function(res) {
        res.entries.should.have.length(3);
        done();
      }, done).done();
    });

    it('will retry given a cursor error by reseting and trying without a cursor', function(done) {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': '2'});

      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder/continue',
          body: match.json({cursor: '1989'})
        },
        res: res.json({error: 'bloop'}, { statusCode: 401 })
      });

      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder',
          body: match.json({path: '', recursive: true})
        },
        res: res.json({has_more: false, entries: [1, 2, 3]})
      });

      this.dropbox.list_folder('1989').then(function(res) {
        res.entries.should.have.length(3);
        fs.readdir('local', function(err, files) {
          if(err) { done(err); return; }
          files.should.have.length(0);
          mockfs.restore();
          done();
        });
      }, done).done();
    });

    it('handles application level errors', function(done) {
      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder',
          body: match.json({path: '', recursive: true}),
        },
        res: res.json({error: {'.tag': 'bloop'}})
      });

      this.dropbox.list_folder().then(function() {
        done('Should have failed.');
      }, function(reason) {
        done();
      }).done();
    });

    it('handles non-json responses as errors', function(done) {
      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder',
          body: match.json({path: '', recursive: true}),
        },
        res: res.text('huh?')
      });

      this.dropbox.list_folder().then(function() {
        done('Should have failed.');
      }, function(reason) {
        done();
      }).done();
    });

    it('makes a list_folder request with a cursor', function(done) {
      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder/continue',
          body: match.json({cursor: '1989'}),
        },
        res: res.json({has_more: false, entries: [1, 2, 3]})
      });

      this.dropbox.list_folder('1989').then(function(res) {
        res.entries.should.have.length(3);
        done();
      }, done).done();
    });

    it('unpages a many list_folder requests', function(done) {
      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder',
          body: match.json({path: '', recursive: true}),
        },
        res: res.json({has_more: true, entries: [1, 2, 3], cursor: '1'})
      });

      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder/continue',
          body: match.json({cursor: '1'}),
        },
        res: res.json({has_more: true, entries: [4, 5], 'cursor': '2'})
      });

      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder/continue',
          body: match.json({cursor: '2'}),
        },
        res: res.json({has_more: false, entries: [6]})
      });

      this.dropbox.list_folder().then(function(res) {
        res.entries.should.have.length(6);
        done();
      }, done).done();
    });

  });

  describe('sync_file()', function() {

    before(function() {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': '2'});
    });

    it('pulls a file off the network and saves it to disk', function(done) {
      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/1989/style.mp3"}'}
        },
        res: res.text('we never go out of style')
      });

      this.dropbox.sync_file({path_lower: '/albums/1989/style.mp3'}).then(function() {
        fs.readFile('local/albums/1989/style.mp3', function(err, content) {
          if(err) { done(err); return; }
          content.toString().should.be.exactly('we never go out of style');
          done();
        })
      }, done).done();
    });

  });

  describe('sync_folder()', function() {

    before(function() {
      mockfs({'local/albums/1989/out-of-the-woods.mp3': '2'});
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
      mockfs({'local/albums/1989/out-of-the-woods.mp3': '2'});
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
      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/radiohead/in-rainbows/nude.mp3"}'}
        },
        res: res.text('dont get any big ideas')
      });

      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/taylor-swift/red/trouble.mp3"}'}
        },
        res: res.text('i knew you were trouble')
      });

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
          fs.readFile('local/albums/taylor-swift/red/trouble.mp3', assertTaylor);
        }

        function assertTaylor(err, content) {
          if (err) { done(err); }
          content.toString().should.be.exactly('i knew you were trouble')
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
      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder',
          body: match.json({path: '', recursive: true})
        },
        res: res.json({
          cursor: '1990',
          has_more: true,
          entries: [
            {path_lower: '/albums/radiohead/in-rainbows/nude.mp3', '.tag': 'file'},
            {path_lower: '/albums/1989', '.tag': 'deleted'},
            {path_lower: '/albums/radiohead/in-rainbows', '.tag': 'folder'},
            {path_lower: '/albums/radiohead/amnesiac', '.tag': 'folder'}
          ]
        })
      });

      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder/continue',
          body: match.json({cursor: '1990'})
        },
        res: res.json({
          cursor: '1991',
          has_more: false,
          entries: [
            {path_lower: '/albums/grizzly-bear/veckatimest', '.tag': 'folder'},
            {path_lower: '/albums/taylor-swift/red', '.tag': 'folder'},
            {path_lower: '/albums/1989/style.mp3', '.tag': 'deleted'},
            {path_lower: '/albums/taylor-swift/red/trouble.mp3', '.tag': 'file'}
          ]
        })
      });

      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/radiohead/in-rainbows/nude.mp3"}'}
        },
        res: res.text('dont get any big ideas')
      });

      this.dropbox_content.mock({
        req: {
          method: 'GET',
          pathname: '/2/files/download',
          headers: {'Dropbox-API-Arg': '{"path":"/albums/taylor-swift/red/trouble.mp3"}'}
        },
        res: res.text('i knew you were trouble')
      });

      this.dropbox.sync().then(function() {
        fs.readFile('local/.pony-token', function(err, content) {
          if(err) { done(err); return; }
          content.toString().should.be.exactly('1991');
          done();
        });
      }, done).done();
    });

    it('deletes the cursor if anything breaks', function(done) {
      this.dropbox_api.mock({
        req: {
          method: 'POST',
          pathname: '/2/files/list_folder',
        },
        res: { destroySocket: true }
      });

      this.dropbox.sync().then(function() {
        done('Should not have resolved.');
      }, function(reason) {
        fs.readFile('local/.pony-token', function(err) {
          reason.message.should.be.exactly('socket hang up');
          if(err) { done(); return; }
          done('Cursor should have been deleted.');
        });

      }).done();
    });

  });

});
