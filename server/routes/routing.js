const express = require('express');
const router = express.Router();

/* Removed catch-all route for non-/api paths since routing is mounted on /api
router.get(/^\/(?!api).*$/, (req, res) => {
  return res.status(404).json({ error: 'Path not recognized in routing, backend begins from endpoint /api' });
});
*/
router.get(/^\/api(\/help)?$/, (req, res) => {
  return res.status(404).json({ 
    error: 'Implemented paths: /test | /reddit | /bluesky | /twitter | /mongodb | /submit-profile' 
  });
});

router.get('/test', (req, res) => {  res.json({ message: '✅ Backend is online!' });});

router.use('/reddit', require('./reddit'));
router.use('/bluesky', require('./bluesky'));
router.use('/twitter', require('./twitter'));
router.use('/x', require('./twitter'));
router.get('/:platform/setic', (req, res) => {
  return res.status(501).json({ error: `SETIC method not implemented for platform: ${req.params.platform}` });
});

router.use('/mongodb', require('./mongodb'));

router.use('/submit-profile', require('./submitProfile'));
router.get('*', (req, res) => {
  return res.status(404).json({ error: 'Path not recognized in routing (/api [/test | /reddit | /bluesky | /twitter | /mongodb | /submit-profile])' });
});


module.exports = router;
