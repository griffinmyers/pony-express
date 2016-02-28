var nock = require('nock');

before(function() {
  nock.disableNetConnect();
});

afterEach(function() {
  nock.cleanAll();
});
