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
