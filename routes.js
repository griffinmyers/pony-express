var router = require('express').Router();
var bodyParser = require('body-parser');
var verify = root_require('lib').verify;
var c = root_require('controllers');

router.get ('/', c.RootController.index);
router.get ('/authorize', c.AuthorizeController.authorize);
router.get ('/authorize/redirect', c.AuthorizeController.redirect);
router.get ('/deploy', c.DeployController.challenge);
router.post('/deploy', bodyParser.json({verify: verify}), c.DeployController.deploy);
router.post('/deploy/sync', bodyParser.json(), c.DeployController.deploy_sync);

module.exports = router;
