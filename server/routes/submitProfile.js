const express = require('express');
const router = express.Router();
const redditProfile = require('../controllers/redditProfile.js');

function extractUsername(platform, input) {
  switch (platform.toLowerCase()) {
    case 'reddit':
      if (/^u\/[a-zA-Z0-9_-]+$/.test(input)) {
        return input.slice(2);
      }
      const redditMatch = input.match(/^https?:\/\/(www\.)?reddit\.com\/user\/([a-zA-Z0-9_-]+)\/?$/);
      return redditMatch ? redditMatch[2] : null;

    case 'bluesky':
      if (/^[a-zA-Z0-9-]+\.bsky\.social$/.test(input)) {
        return input;
      }
      const blueskyMatch = input.match(/^https?:\/\/(www\.)?bsky\.app\/profile\/([a-zA-Z0-9.-]+)$/);
      return blueskyMatch ? blueskyMatch[2] : null;

    case 'x':
      const username = input.startsWith('@') ? input.slice(1) : input;
      return /^[a-zA-Z0-9_]{1,15}$/.test(username) ? username : null;

    case 'instagram':
      return /^[a-zA-Z0-9._]{1,30}$/.test(input) ? input : null;

    case 'facebook':
      const fbMatch = input.match(/^https?:\/\/(www\.)?facebook\.com\/([a-zA-Z0-9.]+)\/?$/);
      return fbMatch ? fbMatch[2] : null;

    default:
      return null;
  }
}

router.post('/', async (req, res) => {
  const { platform, input, token } = req.body;

  if (!platform || !input) {
    return res.status(400).json({ error: 'Platform and input are required.' });
  }

  const username = extractUsername(platform, input);
  if (!username) {
    return res.status(400).json({ error: 'Invalid profile format for platform: ' + platform });
  }

  try {
    switch (platform.toLowerCase()) {
      case 'reddit':
        req.body.username = username.toLowerCase();
        return await redditProfile.getRedditProfile(req, res);
      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
  } catch (err) {
    console.error(`Error processing ${platform} profile:`, err);
    res.status(500).json({ error: 'An error occurred while processing the profile.' });
  }
});

module.exports = router;
