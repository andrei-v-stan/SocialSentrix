const express = require('express');
const router = express.Router();
const blueskyProfile = require('../controllers/blueskyProfile');
const blueskyAuth = require('../controllers/blueskyAuth');

router.post('/profile', blueskyProfile.getBlueskyProfile);
//router.get('/auth', blueskyAuth.startBlueskyAuth);
//router.get('/auth/callback', blueskyAuth.handleBlueskyCallback);
//router.get('/session', blueskyAuth.getBlueskySession);

module.exports = router;
