const express = require('express');
const router = express.Router();

router.get('/api/test', (req, res) => {  res.json({ message: 'Hello there!' });});

router.use('/api/reddit', require('./reddit'));
router.use('/api/bluesky', require('./bluesky'));
router.use('/api/twitter', require('./twitter'));

router.use('/api/mongodb', require('./mongodb'));

router.use('/api/submit-profile', require('./submitProfile'));


module.exports = router;
