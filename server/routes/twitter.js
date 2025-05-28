const express = require('express');
const router = express.Router();
const twitterProfile = require('../controllers/twitter/twitterProfile');
const twitterAuth = require('../controllers/twitter/twitterAuth');
const twitterSETIC = require('../controllers/twitter/twitterSETIC');

router.post('/profile', twitterProfile.getTwitterProfile);
router.post('/login', twitterAuth.authTwitterProfile);
//router.get('/calculate-setic', twitterSETIC.getSETIC);

module.exports = router;