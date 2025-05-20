const express = require('express');
const router = express.Router();
const blueskyProfile = require('../controllers/blueskyProfile');
const blueskyAuth = require('../controllers/blueskyAuth');
const blueskySETIC = require('../controllers/blueskySETIC');

router.post('/profile', blueskyProfile.getBlueskyProfile);
router.post('/login', blueskyAuth.authBlueskyProfile);
//router.get('/calculate-setic', blueskySETIC.getSETIC);

module.exports = router;

/*
const express = require('express');
const router = express.Router();
const redditProfile = require('../controllers/redditProfile.js');
const redditAuth = require('../controllers/redditAuth.js');
const redditSETIC = require('../controllers/redditSETIC.js');

router.post('/profile', redditProfile.getRedditProfile);
router.get('/auth', redditAuth.startRedditAuth);
router.get('/auth/callback', redditAuth.handleRedditCallback);
router.get('/session', redditAuth.getRedditSession);
router.get('/calculate-setic', redditSETIC.getSETIC);

module.exports = router;
*/