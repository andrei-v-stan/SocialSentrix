const express = require('express');
const router = express.Router();

router.use('/', require('../controllers/mongodb/accountRegisterConfirm'));

router.use('/', require('../controllers/mongodb/loginStatus'));

router.use('/', require('../controllers/mongodb/getUserData'));

router.use('/', require('../controllers/mongodb/manageSessions'));

router.use('/clear-collections', require('../controllers/mongodb/clearCollections'));

module.exports = router;
