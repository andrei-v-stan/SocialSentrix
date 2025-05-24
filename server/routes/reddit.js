const express = require('express');
const router = express.Router();
const redditProfile = require('../controllers/reddit/redditProfile.js');
const redditAuth = require('../controllers/reddit/redditAuth.js');
const redditSETIC = require('../controllers/reddit/redditSETIC.js');

router.post('/profile', redditProfile.getRedditProfile);
router.get('/auth', redditAuth.startRedditAuth);
router.get('/auth/callback', redditAuth.handleRedditCallback);
router.get('/calculate-setic', redditSETIC.getSETIC);

module.exports = router;
