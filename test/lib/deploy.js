var deploy = require('../../lib/deploy.js');

describe('Deploy', function() {

  describe('deploy()', function() {

    it('requires a user id', function(done) {
      deploy().then(function() {
        done('Should have failed.');
      }, function() {
        done();
      })
    });

    it('chokes on an unknown user id', function(done) {
      deploy(1).then(function() {
        done('Should have failed.');
      }, function() {
        done();
      })
    });

    it('chokes on many unknown user ids', function(done) {
      deploy([1, 2, 3]).then(function() {
        done('Should have failed.');
      }, function() {
        done();
      })
    });

  });

});
