const express = require('express');
const router = express.Router();

router.get(/^\/(?!api).*$/, (req, res) => {
  return res.status(404).json({ error: 'Path not recognized in routing, backend begins from endpoint /api' });
});
router.get(/^\/api(\/help)?$/, (req, res) => {
  return res.status(404).json({ 
    error: 'Implemented paths: /test | /reddit | /bluesky | /twitter | /mongodb | /submit-profile' 
  });
});

router.get('/api/test', (req, res) => {  res.json({ message: '✅ Backend is online!' });});

router.use('/api/reddit', require('./reddit'));
router.use('/api/bluesky', require('./bluesky'));
router.use('/api/twitter', require('./twitter'));
router.use('/api/x', require('./twitter'));
router.get('/api/:platform/setic', (req, res) => {
  return res.status(501).json({ error: `SETIC method not implemented for platform: ${req.params.platform}` });
});

router.use('/api/mongodb', require('./mongodb'));

router.use('/api/submit-profile', require('./submitProfile'));
router.get('*', (req, res) => {
  return res.status(404).json({ error: 'Path not recognized in routing (/api [/test | /reddit | /bluesky | /twitter | /mongodb | /submit-profile])' });
});


module.exports = router;
