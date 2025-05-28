const express = require('express');
const { getDb, dbProfiles } = require('../services/mongo');
const redditProfile = require('../controllers/reddit/redditProfile.js');
const blueskyProfile = require('../controllers/bluesky/blueskyProfile.js');
const twitterProfile = require('../controllers/twitter/twitterProfile.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const router = express.Router();

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

const fetchDb = async (platform, username) => {
  const db = getDb();
  const profile = await db.collection(dbProfiles).findOne({ platform, username });
  return !!profile;
};


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
      const trimmedInput = input.trim().replace(/\u200E|\u200F/g, '');
      const urlMatch = trimmedInput.match(/^https?:\/\/(www\.)?bsky\.app\/profile\/([a-zA-Z0-9.-]+)$/);
      if (urlMatch) return urlMatch[2].toLowerCase();

      const clean = trimmedInput.replace(/^@/, '').toLowerCase();
      return clean.includes('.') ? clean : `${clean}.bsky.social`;
    }

    case 'twitter': {
      const trimmedInput = input.trim();
      const urlMatch = trimmedInput.match(/^https?:\/\/(www\.)?x\.com\/([a-zA-Z0-9_]{1,15})\/?$/);
      if (urlMatch) return urlMatch[2];

      const handleMatch = trimmedInput.match(/^@([a-zA-Z0-9_]{1,15})$/);
      if (handleMatch) return handleMatch[1];

      if (/^[a-zA-Z0-9_]{1,15}$/.test(trimmedInput)) return trimmedInput;
      return null;
    }

    default:
      return null;
  }
}


async function checkRedditUserExistsOrCached(username) {
  const exists = await safeFetch(`https://www.reddit.com/user/${username}/about.json`);
  if (exists && exists.data) return true;
  return await fetchDb('reddit', username);
}

async function checkBlueskyUserExistsOrCached(username) {
  const exists = await safeFetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?actors=${username}`);
  if (exists?.profiles?.length) return true;
  return await fetchDb('bluesky', username);
}
const fs = require('fs');
const path = require('path');

async function checkTwitterUserExistsOrCached(username) {
  const profileUrl = `https://x.com/${username}`;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    console.log(profileUrl)
    const response = await page.goto(profileUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    const pageContent = await page.content();
    const notFound = pageContent.includes('This account doesn’t exist') ||
      pageContent.includes("This account doesn't exist") ||
      pageContent.includes('Try searching for another');
    const savePath = path.join(__dirname, `twitter-${username}.html`);
    fs.writeFileSync(savePath, pageContent, 'utf8');
    console.log(`Saved HTML for ${username} to ${savePath}`);
    if (notFound) {
      console.log('Twitter profile not found:', username);
      return await fetchDb('twitter', username);
    }


    return true;
  } catch (err) {
    console.warn(`Twitter profile check failed for '${username}':`, err.message);
    return await fetchDb('twitter', username);
  } finally {
    if (browser) await browser.close();
  }
}




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
        const exists = await checkRedditUserExistsOrCached(normalizedUsername);
        if (!exists) {
          return res.status(404).json({ error: `Reddit user '${normalizedUsername}' not found.` });
        }
        req.body.username = normalizedUsername;
        return await redditProfile.getRedditProfile(req, res);
      }

      case 'bluesky': {
        const exists = await checkBlueskyUserExistsOrCached(normalizedUsername);
        if (!exists) {
          return res.status(404).json({ error: `Bluesky user '${normalizedUsername}' not found.` });
        }
        req.body.username = normalizedUsername;
        return await blueskyProfile.getBlueskyProfile(req, res);
      }

      case 'twitter': {
        const exists = await checkTwitterUserExistsOrCached(normalizedUsername);
        if (!exists) {
          return res.status(404).json({ error: `Twitter user '${normalizedUsername}' not found.` });
        }
        req.body.username = normalizedUsername;
        return await twitterProfile.getTwitterProfile(req, res);
      }

      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
  } catch (err) {
    console.error(`Error processing ${platform} profile:`, err);
    return res.status(500).json({ error: 'An error occurred while processing the profile.' });
  }
});

module.exports = router;
