const express = require('express');
const router = express.Router();
const redditProfile = require('../controllers/reddit/redditProfile.js');
const blueskyProfile = require('../controllers/bluesky/blueskyProfile.js');

function extractUsername(platform, input) {
  switch (platform.toLowerCase()) {
    case 'reddit': {
      if (/^u\/[a-zA-Z0-9_-]+$/.test(input)) {
        return input.slice(2);
      }
      const redditMatch = input.match(/^https?:\/\/(www\.)?reddit\.com\/user\/([a-zA-Z0-9_-]+)\/?$/);
      if (redditMatch) {
        return redditMatch[2];
      }
      if (/^[a-zA-Z0-9_-]+$/.test(input)) {
        return input;
      }
      return null;
    }

    case 'bluesky': {
      const urlMatch = input.match(/^https?:\/\/(www\.)?bsky\.app\/profile\/([a-zA-Z0-9.-]+)$/);
      if (urlMatch) return urlMatch[2].toLowerCase();
      const clean = input.replace(/^@/, '').toLowerCase();
      if (clean.includes('.')) {
        return clean;
      }
      return `${clean}.bsky.social`;
    }

    case 'x': {
      const username = input.startsWith('@') ? input.slice(1) : input;
      return /^[a-zA-Z0-9_]{1,15}$/.test(username) ? username : null;
    }

    case 'instagram':
      return /^[a-zA-Z0-9._]{1,30}$/.test(input) ? input : null;

    case 'facebook': {
      const fbMatch = input.match(/^https?:\/\/(www\.)?facebook\.com\/([a-zA-Z0-9.]+)\/?$/);
      return fbMatch ? fbMatch[2] : null;
    }

    default:
      return null;
  }
}

const safeFetch = async (url) => {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SocialSentrixBot/1.0 (by u/SocialSentrix)' }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Error checking user existence:`, err.message);
    return null;
  }
};

router.post('/', async (req, res) => {
  const { platform, input } = req.body;

  if (!platform || !input) {
    return res.status(400).json({ error: 'Platform and input are required.' });
  }

  const username = extractUsername(platform, input);
  if (!username) {
    return res.status(400).json({ error: 'Invalid profile format for platform: ' + platform });
  }

  const normalizedUsername = username.toLowerCase();

  try {
    switch (platform.toLowerCase()) {
      case 'reddit': {
        const exists = await safeFetch(`https://www.reddit.com/user/${normalizedUsername}/about.json`);
        if (!exists || !exists.data) {
          return res.status(404).json({ error: `Reddit user '${normalizedUsername}' not found.` });
        }
        req.body.username = normalizedUsername;
        return await redditProfile.getRedditProfile(req, res);
      }
      case 'bluesky': {
        const exists = await safeFetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${normalizedUsername}`);
        if (!exists || exists.error) {
          return res.status(404).json({ error: `Bluesky user '${normalizedUsername}' not found.` });
        }
        req.body.username = normalizedUsername;
        return await blueskyProfile.getBlueskyProfile(req, res);
      }
      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
  } catch (err) {
    console.error(`Error processing ${platform} profile:`, err);
    res.status(500).json({ error: 'An error occurred while processing the profile.' });
  }
});

module.exports = router;
