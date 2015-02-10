var router = require('express').Router();
var bodyParser = require('body-parser');
var verify = root_require('lib').verify;

var RootController = root_require('controllers').RootController;
var AuthorizeController = root_require('controllers').AuthorizeController;
var DeployController = root_require('controllers').DeployController;

router.get ('/', RootController.index);
router.get ('/authorize', AuthorizeController.authorize);
router.get ('/authorize/redirect', AuthorizeController.redirect);
router.get ('/deploy', DeployController.challenge);
router.post('/deploy', bodyParser.json({verify: verify}), DeployController.deploy);
router.post('/deploy/sync', bodyParser.json(), DeployController.deploy_sync);

module.exports = router;
