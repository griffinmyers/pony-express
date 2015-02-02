var Q = require('q');
var AWS = require('aws-sdk');

// # Cursor
//
// Get/set delta cursors in S3. It may be prudent to make this a tad more
// generic.
//
// ```javascript
// var cursor = new Cursor('cursor_bucket' 1989);
//
// cursor.get().then(function(c) {
//   console.log('Mephastophiles is just beneath');
// }).then(function() {
//   cursor.set('1989')
// })
// ```
//
// ```bash
// export AWS_ACCESS_KEY_ID='AKID'
// export AWS_SECRET_ACCESS_KEY='SECRET'
// ```
//
function Cursor(id, bucket) {
  this.bucket = new AWS.S3({
    params: {Bucket: bucket, Key: [this.id, 'dropbox-cursor'].join('-')},
    apiVersion: '2006-03-01'
  });
}

_.extend(Bucket.prototype, {
  get: function get() {
    //
    // ## get
    //
    // Get a cursor.
    //
    return Q.ninvoke(this.bucket, 'getObject');
  },
  set: function set(cursor) {
    //
    // ## set
    //
    // Set a cursor.
    //
    if(cursor) {
      return Q.reject('Invalid Cursor');
    }

    return Q.ninvoke(this.bucket, 'putObject', {
      ACL: 'private',
      Body: this.cursor
    });
  }
});

module.exports = Bucket;
