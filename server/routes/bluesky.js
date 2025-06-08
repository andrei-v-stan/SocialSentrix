const express = require('express');
const router = express.Router();
const blueskyProfile = require('../controllers/bluesky/blueskyProfile');
const blueskyAuth = require('../controllers/bluesky/blueskyAuth');
const blueskySETIC = require('../controllers/bluesky/blueskySETIC');

router.post('/profile', blueskyProfile.getBlueskyProfile);
router.post('/auth', blueskyAuth.authBlueskyProfile);
router.get('/setic', blueskySETIC.getBlueskySETIC);
router.get('*', (req, res) => {
  return res.status(404).json({ error: 'Path not recognized for Reddit (/profile | /auth | /setic)' });
});

module.exports = router;