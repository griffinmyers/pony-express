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
function Store(bucket, cache) {
  this.cache = cache && {} || false;
  this.bucket = new AWS.S3({params: {Bucket: bucket}, apiVersion: '2006-03-01'});
}

_.extend(Store.prototype, {
  get: function get(key) {
    //
    // ## get
    //
    // Get an object
    //
    var self = this;

    if(self.cache && _.has(self.cache, key)) {
      return Q(self.cache[key]);
    }

    return Q.ninvoke(self.bucket, 'getObject', {Key: key.toString()}).then(function(res) {
      var result = res.Body.toString();
      if(self.cache) { self.cache[key] = result; }
      return result;
    });
  },
  put: function put(key, value) {
    //
    // ## put
    //
    // Put an object
    //
    return Q.ninvoke(this.bucket, 'putObject', {Key: key.toString(), Body: value});
  }
});

module.exports = Store;
