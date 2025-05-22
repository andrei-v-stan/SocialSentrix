const express = require('express');
const router = express.Router();
const blueskyProfile = require('../controllers/bluesky/blueskyProfile');
const blueskyAuth = require('../controllers/bluesky/blueskyAuth');
const blueskySETIC = require('../controllers/bluesky/blueskySETIC');

router.post('/profile', blueskyProfile.getBlueskyProfile);
router.post('/login', blueskyAuth.authBlueskyProfile);
//router.get('/calculate-setic', blueskySETIC.getSETIC);

module.exports = router;