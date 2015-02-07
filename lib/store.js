var Q = require('q');
var _ = require('lodash');
var AWS = require('aws-sdk');

// # Store
//
//
// ```javascript
// var store = new Store('dropbox-keys');
//
// store.get('key').then(function(result) {
//   console.log(result);
// });
// ```
//
// ```bash
// export AWS_ACCESS_KEY_ID='AKID'
// export AWS_SECRET_ACCESS_KEY='SECRET'
// ```
//
var cache = {};

function Store(bucket, cache) {
  this.cache = cache || false;
  this.bucket = new AWS.S3({params: {Bucket: bucket}, apiVersion: '2006-03-01'});
}

_.extend(Store.prototype, {
  get: function get(key) {
    //
    // ## get
    //
    // Get an object
    //
    if(this.cache && _.has(cache, key)) {
      return Q(cache[key]);
    }

    return Q.ninvoke(this.bucket, 'getObject', {Key: key});
  },
  put: function put(key, value) {
    //
    // ## put
    //
    // Put an object
    //
    if(this.cache) {
      cache[key] = value;
    }

    return Q.ninvoke(this.bucket, 'putObject', {Key: key, Body: value});
  }
});

module.exports = Store;
