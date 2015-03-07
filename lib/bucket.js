var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var _ = require('lodash');
var glob = require('glob');
var AWS = require('aws-sdk');
var mime = require('mime');
var logger = require('./logger');
var Store = require('./store');

// # Bucket
//
// A collection of utilites for interacting with an S3 Bucket. Credentials
// should be in the environment.
//
// ```javascript
// var bucket = new Bucket('build' 'portfolio.com');
//
// The first param is the local file that represents what's going to be
// in your bucket. The second param is the actual bucket name.
//
// bucket.push().then(function(result) {
//   console.log('This will be on my videotape');
// });
// ```
//
// ```bash
// export AWS_ACCESS_KEY_ID='AKID'
// export AWS_SECRET_ACCESS_KEY='SECRET'
// ```
//
var MANIFEST_FILE = '.pony-manifest';

function Bucket(local_bucket, bucket) {
  this.local_bucket = local_bucket;
  this.bucket = new AWS.S3({params: {Bucket: bucket}, apiVersion: '2006-03-01'});
  this.manifest_store = new Store(bucket, false);
}

_.extend(Bucket.prototype, {
  push: function push() {
    //
    // ## push
    //
    var self = this;

    var remote_manifest = self.get_remote_manifest().catch(function(reason) {
      logger.info('Remote manifest could not be fetched:', reason.message);
      return null;
    });

    var local_manifest = self.get_local_manifest();

    return Q.all([remote_manifest, local_manifest]).spread(function(remote, local) {
      var upload = remote ? self.upload_diff(remote, local) : self.upload_all(local);
      return upload.then(self.put_remote_manifest.bind(self, local));
    }).catch(function(reason) {
      logger.error('Problem syncing with S3:', reason.message);
      logger.info('Removing', MANIFEST_FILE);
      return self.del([MANIFEST_FILE]);
    });
  },
  upload_all: function upload_all(local) {
    //
    // ## upload_all
    //
    // Uploads all files in the local manifest to the bucket, first clearing
    // out the bucket.
    //
    var self = this;

    return self.clear().then(function() {
      return Q.all(_.map(local, function(hash, remote_path) {
        logger.info('Uploading', remote_path);
        return self.upload(remote_path);
      }))
    });
  },
  upload_diff: function upload_diff(remote, local) {
    //
    // ## upload_diff
    //
    // Uploads just a diff of the remote and local manifests to the bucket.
    //
    //  * If a file is in remote that is not in local, remote is deleted.
    //  * If a file is in local that is not in remote, it is uploaded.
    //  * If a file is in local and remote and the SHA1 hashes are equivalent,
    //    it is skipped, else it is uploaded overwriting any old file.
    //
    var self = this;
    var remotes = _.keys(remote);
    var locals = _.keys(local);

    _.forEach(_.difference(remotes, locals), function(remote_path) {
      logger.info('Deleting', remote_path);
    });

    deletes = self.del(_.difference(remotes, locals));

    uploads = Q.all(_.map(_.difference(locals, remotes), function(remote_path){
      logger.info('Uploading', remote_path);
      return self.upload(remote_path);
    }));

    syncs = Q.all(_.map(_.intersection(locals, remotes), function(remote_path) {
      if(remote[remote_path] === local[remote_path]) {
        return Q('File in sync');
      }
      else {
        logger.info('Syncing', remote_path);
        return self.upload(remote_path);
      }
    }));

    return Q.all([deletes, uploads, syncs]);
  },
  upload: function upload(file) {
    //
    // ## upload
    //
    // Upload a file.
    //
    var self = this;

    return Q.ninvoke(self.bucket, 'upload', {
      Key: file,
      Body: fs.createReadStream(path.join(self.local_bucket, file)),
      ContentType: mime.lookup(file)
    });
  },
  del: function del(files) {
    //
    // ## del
    //
    // Delete a file.
    //
    if(_.isEmpty(files)) {
      return Q('Nothing to delete');
    }

    return Q.ninvoke(this.bucket, 'deleteObjects', {
      Delete: {
        Objects: _.map(files, function(file) { return {Key: file} })
      }
    });
  },
  list: function list() {
    //
    // ## list
    //
    // List the contents of a bucket.
    //
    return Q.ninvoke(this.bucket, 'listObjects').then(function(result) {
      return _.pluck(result.Contents, 'Key')
    });
  },
  clear: function clear() {
    //
    // ## clear
    //
    // Clear the contents of a bucket.
    //
    return this.list().then(this.del.bind(this));
  },
  put_remote_manifest: function put_remote_manifest(manifest) {
    //
    // ## put_remote_manifest
    //
    // Will save the passed manifest locally and push it to the remote bucket.
    //
    return this.manifest_store.put(MANIFEST_FILE, JSON.stringify(manifest));
  },
  get_remote_manifest: function get_remote_manifest() {
    //
    // ## get_remote_manifest
    //
    // Pull the remote manifest.
    //
    return this.manifest_store.get(MANIFEST_FILE).then(function(manifest) {
      return JSON.parse(manifest.Body.toString());
    })
  },
  get_local_manifest: function get_local_manifest() {
    //
    // ## get_local_manifest
    //
    // Generates a manifest of the local bucket, which is just a mapping of
    // pathname to SHA1.
    //
    var self = this;

    return Q.nfcall(glob, path.join(self.local_bucket, '**', '*')).then(function(files) {
      return Q.all(_.map(files, function(file) {
        return Q.ninvoke(fs, 'readFile', file).then(function(contents) {
          var key = path.relative(self.local_bucket, file);
          var hash = crypto.createHash('sha1').update(contents).digest('hex');

          return [key, hash];
        }, _.noop)
      })).then(to_object);
    })
  }
});

function to_object(pairs) {
  //
  // ## to_object
  //
  // Accepts a pairs array like [['a', 1], ['b', 2], undefined] and returns
  // {a: 1, b: 2}
  //
  return _.reduce(_.compact(pairs), function(acc, pair) {
    var obj = {};
    obj[pair[0]] = pair[1];
    return _.extend({}, acc, obj);
  }, {});
}

module.exports = Bucket;
