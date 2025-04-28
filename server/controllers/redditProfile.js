const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { getDb, dbAccounts, dbProfiles } = require('../services/mongo');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function safeFetch(url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SocialSentrixBot/1.0 (by u/SocialSentrix)',
        ...headers
      }
    });
    if (res.status === 401) return { error: true, unauthorized: true, status: 401 };
    if (!res.ok) throw new Error(`Bad response from ${url} (Status: ${res.status})`);
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching ${url}:`, err.message);
    const match = err.message.match(/Status: (\d+)/);
    const status = match ? parseInt(match[1], 10) : null;
    return { error: true, status };
  }
}


async function fetchAllItems(baseUrl, headers = {}, limit = 10000) {
  let results = [];
  let after = null;
  let unauthorized = false;

  while (true) {
    const url = `${baseUrl}?limit=100${after ? `&after=${after}` : ''}`;
    const res = await safeFetch(url, headers);
    if (res.unauthorized) {
      unauthorized = true;
      break;
    }
    if (res.error || !res.data?.children?.length) break;

    results = results.concat(res.data.children);
    after = res.data.after;
    if (!after || results.length >= limit) break;
  }

  return { results, unauthorized };
}

async function scrapeRedditExtras(username, trophyNames = []) {
  const profileUrl = `https://www.reddit.com/user/${username}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => setTimeout(resolve, 2000));

  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h2'));
    const targetHeading = headings.find(h =>
      h.innerText?.toLowerCase().includes('moderator of these communities')
    );
    if (!targetHeading) return;
    const next1 = targetHeading.nextElementSibling;
    const next2 = next1?.nextElementSibling;
    if (next2?.tagName === 'FACEPLATE-PARTIAL') {
      const button = next2.querySelector('button');
      if (button) button.click();
    }
  });

  await page.waitForFunction(() => {
    return document.querySelectorAll('ul[role="menu"]').length > 1;
  }, { timeout: 5000 }).catch(() => { });
  await page.waitForSelector('faceplate-partial[src*="moderated_subreddits"]', { timeout: 5000 }).catch(() => { });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const scrapedData = await page.evaluate((username, trophyNames) => {
    const trackers = Array.from(document.querySelectorAll('faceplate-tracker'));
    const faceplate = trackers.find(el =>
      el.getAttribute('data-faceplate-tracking-context')?.includes(`"name":"${username}"`)
    );

    const badges = faceplate
      ? Array.from(faceplate.querySelectorAll('faceplate-tooltip span'))
        .map(span => span.textContent.trim())
        .filter(text => text !== "")
      : [];

    const profileName = faceplate?.querySelector('h2')?.innerText.trim() || null;
    const description = document.querySelector('[data-testid="profile-description"]')?.innerText.trim() || null;

    const allLists = Array.from(document.querySelectorAll('ul[role="menu"]'));
    const allItems = allLists.flatMap(ul =>
      Array.from(ul.querySelectorAll('li a[href*="/r/"]')).map(item => {
        const name = item.querySelector('span.text-14')?.innerText.trim();
        const members = item.querySelector('faceplate-number')?.innerText.trim();
        const iconImg = item.querySelector('img')?.src;
        const href = item.href;
        return { name, members, icon: iconImg, url: href };
      })
    );

    const moderatedSubreddits = allItems.filter(sub => sub.name && !trophyNames.includes(sub.name));
    return { badges, description, profileName, moderatedSubreddits };
  }, username, trophyNames);

  await browser.close();
  return scrapedData;
}

function buildMeaningfulUpdate(basePath, data, updateDoc) {
  if (data == null) return;

  if (Array.isArray(data)) {
    if (data.length > 0) {
      updateDoc.$set[basePath] = data;
    }
    return;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return;

    for (const key of keys) {
      const value = data[key];
      buildMeaningfulUpdate(`${basePath}.${key}`, value, updateDoc);
    }
    return;
  }

  updateDoc.$set[basePath] = data;
}

exports.getRedditProfile = async (req, res) => {
  const { username } = req.body;
  const userID = req.cookies.userID;

  if (!username) return res.status(400).json({ error: 'Invalid Reddit username format' });

  const db = getDb();
  const accountsCol = db.collection(dbAccounts);
  const profilesCol = db.collection(dbProfiles);

  let ownerMode = false;
  let token = null;
  const platform = 'reddit';
  let tokenInvalid = false;

  if (userID) {
    const userAccount = await accountsCol.findOne({ id: userID });
    if (userAccount) {
      const isOwner = userAccount.ownedProfiles?.find(p => p.platform === platform && p.user === username);
      if (isOwner) {
        token = isOwner.reddit_token || null;
        ownerMode = true;
      } else {
        const alreadyAssociated = userAccount.associatedProfiles?.some(p => p.platform === platform && p.user === username);
        if (!alreadyAssociated) {
          await accountsCol.updateOne(
            { id: userID },
            { $push: { associatedProfiles: { platform, user: username } } }
          );
        }
      }
    }
  }

  const isOwnProfile = ownerMode;
  const publicBase = `https://api.reddit.com/user/${username}`;
  const authBase = `https://oauth.reddit.com/user/${username}`;
  const headers = token ? { Authorization: `Bearer ${token}`, 'User-Agent': 'SocialSentrixBot/1.0 (by u/SocialSentrix)' } : {};

  const [about, trophies, submittedRes, commentsRes] = await Promise.all([
    safeFetch(`${publicBase}/about`),
    safeFetch(`${publicBase}/trophies`),
    fetchAllItems(`${publicBase}/submitted`),
    fetchAllItems(`${publicBase}/comments`)
  ]);

  const submittedRaw = submittedRes.results || [];
  const commentsRaw = commentsRes.results || [];

  let upvotedRaw = [], downvotedRaw = [], hiddenRaw = [];
  if (isOwnProfile) {
    const [upvotesRes, downvotesRes, hiddenRes] = await Promise.all([
      fetchAllItems(`${authBase}/upvoted`, headers),
      fetchAllItems(`${authBase}/downvoted`, headers),
      fetchAllItems(`${authBase}/hidden`, headers)
    ]);

    if (upvotesRes.unauthorized || downvotesRes.unauthorized || hiddenRes.unauthorized) {
      tokenInvalid = true;
    }

    upvotedRaw = upvotesRes.results || [];
    downvotedRaw = downvotesRes.results || [];
    hiddenRaw = hiddenRes.results || [];
  }

  const parsePosts = (children) =>
    children?.map(post => ({
      title: post.data.title,
      text: post.data.selftext,
      upvotes: post.data.ups,
      comments: post.data.num_comments,
      subreddit: post.data.subreddit,
      permalink: post.data.permalink,
      createdAt: post.data.created_utc ? new Date(post.data.created_utc * 1000) : null
    })) || [];

  const parseComments = (children) =>
    children?.map(comment => ({
      text: comment.data.body,
      upvotes: comment.data.ups,
      subreddit: comment.data.subreddit,
      permalink: comment.data.permalink,
      createdAt: comment.data.created_utc ? new Date(comment.data.created_utc * 1000) : null
    })) || [];

  const existingProfile = await profilesCol.findOne({ platform, username });
  const noDataFetched = (about?.error || !about?.data) && submittedRaw.length === 0 && commentsRaw.length === 0;
  if (noDataFetched && !existingProfile) {
    if (userID) {
      await accountsCol.updateOne(
        { id: userID },
        { $pull: { associatedProfiles: { platform, user: username } } }
      );
    }
    return res.status(404).json({ error: 'User not found or no public activity.' });
  }


  const cakeDay = about?.data?.created_utc ? new Date(about.data.created_utc * 1000) : null;
  const trophyNames = trophies?.data?.trophies?.map(t => t.data.name) || [];
  const scraped = await scrapeRedditExtras(username, trophyNames);

  const guestView = {
    cakeDay,
    karma: {
      comment: about?.data?.comment_karma ?? null,
      post: about?.data?.link_karma ?? null,
      total: about?.data?.total_karma ?? null
    },
    about: {
      subreddit: about?.data?.subreddit ?? {},
      is_gold: about?.data?.is_gold,
      has_verified_email: about?.data?.has_verified_email,
      icon_img: about?.data?.icon_img,
      snoovatar_img: about?.data?.snoovatar_img
    },
    trophies: trophies?.data?.trophies?.map(t => ({
      name: t.data.name,
      description: t.data.description,
      icon: t.data.icon_70
    })) || [],
    posts: parsePosts(submittedRaw),
    comments: parseComments(commentsRaw),
    badges: scraped.badges,
    profileName: scraped.profileName,
    description: scraped.description,
    moderatedSubs: scraped.moderatedSubreddits
  };

  const ownerView = ownerMode ? {
    upvoted: parsePosts(upvotedRaw),
    downvoted: parsePosts(downvotedRaw),
    hidden: parsePosts(hiddenRaw)
  } : undefined;

  const updateDoc = { $set: { platform, username } };

  if (guestView) {
    buildMeaningfulUpdate('guestView', guestView, updateDoc);
  }
  if (ownerMode && ownerView) {
    buildMeaningfulUpdate('ownerView', ownerView, updateDoc);
  }


  await profilesCol.updateOne(
    { platform, username },
    updateDoc,
    { upsert: true }
  );

  const savedProfile = await profilesCol.findOne(
    { platform, username },
    { projection: { _id: 0, guestView: 1, ownerView: 1 } }
  );

  if (!savedProfile || !savedProfile.guestView) {
    return res.status(500).json({ error: 'Profile save or retrieval failed.' });
  }

  return res.json({
    platform,
    username,
    tokenInvalid,
    posts: savedProfile.guestView.posts || [],
    comments: savedProfile.guestView.comments || [],
    ...(ownerMode && savedProfile.ownerView && {
      upvotes: savedProfile.ownerView.upvoted || [],
      downvotes: savedProfile.ownerView.downvoted || [],
      hidden: savedProfile.ownerView.hidden || []
    })
  });
};
