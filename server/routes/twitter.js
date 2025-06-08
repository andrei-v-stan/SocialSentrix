const express = require('express');
const router = express.Router();
const twitterProfile = require('../controllers/twitter/twitterProfile');
const twitterAuth = require('../controllers/twitter/twitterAuth');
const twitterSETIC = require('../controllers/twitter/twitterSETIC');

router.post('/profile', twitterProfile.getTwitterProfile);
router.post('/auth', twitterAuth.authTwitterProfile);
//router.get('/setic', twitterSETIC.getTwitterSETIC);
router.get('/setic', (req, res) => {
  return res.status(501).json({ error: 'SETIC method not implemented for Twitter' });
});
router.get('*', (req, res) => {
  return res.status(404).json({ error: 'Path not recognized for Reddit (/profile | /auth | /setic)' });
});

module.exports = router;