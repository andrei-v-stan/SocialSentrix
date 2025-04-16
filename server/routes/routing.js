const express = require('express');
const router = express.Router();

router.get('/api/test', (req, res) => {  res.json({ message: 'Hello there!' });});

router.use('/api/bluesky', require('./bluesky'));
router.use('/api/reddit', require('./reddit'));
router.use('/api/mongodb', require('./mongodb'));

router.use('/api', require('../tests/testMongoDBAcc.js'));

module.exports = router;
