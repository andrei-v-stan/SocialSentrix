const express = require('express');
const router = express.Router();
const redditProfile = require('../controllers/reddit/redditProfile.js');
const redditAuth = require('../controllers/reddit/redditAuth.js');
const redditSETIC = require('../controllers/reddit/redditSETIC.js');

router.post('/profile', redditProfile.getRedditProfile);
router.get('/auth', redditAuth.startRedditAuth);
router.get('/auth/callback', redditAuth.handleRedditCallback);
router.get('/setic', redditSETIC.getRedditSETIC);

router.get(/^\/(help)?$/, (req, res) => {
  return res.status(404).json({
    error: 'Reddit API: /profile (POST), /auth, /auth/callback, /setic'
  });
});
router.get('*', (req, res) => {
  return res.status(404).json({ error: 'Path not recognized for Reddit (/profile | /auth | /setic)' });
});

module.exports = router;
