const express = require('express');
const router = express.Router();

router.use('/', require('../controllers/mongodb/registerAccount'));
router.use('/', require('../controllers/mongodb/confirmAccount'));
router.use('/', require('../controllers/mongodb/requestLogin'));
router.use('/', require('../controllers/mongodb/loginConfirmDeny'));
router.use('/', require('../controllers/mongodb/checkLoginStatus'));
router.use('/', require('../controllers/mongodb/getAccountEmail'));

router.use('/', require('../controllers/mongodb/clearCollections'));

module.exports = router;
