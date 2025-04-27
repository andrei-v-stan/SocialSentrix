const express = require('express');
const router = express.Router();

router.use('/register-account', require('../controllers/mongodb/registerAccount'));
router.use('/confirm-account', require('../controllers/mongodb/confirmAccount'));

router.use('/request-login', require('../controllers/mongodb/requestLogin'));
router.use('/', require('../controllers/mongodb/loginConfirmDeny'));
router.use('/check-login-status', require('../controllers/mongodb/checkLoginStatus'));

router.use('/get-account-email', require('../controllers/mongodb/getAccountEmail'));
router.use('/get-user-profiles', require('../controllers/mongodb/getUserProfiles'));

router.use('/clear-collections', require('../controllers/mongodb/clearCollections'));

module.exports = router;
