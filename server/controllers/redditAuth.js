const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const querystring = require('querystring');
const { ObjectId } = require('mongodb');
const { getDb, dbAccounts } = require('../services/mongo');

const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDDIT_REDIRECT_URI;

exports.startRedditAuth = (req, res) => {
  const state = JSON.stringify({
    redirectTo: req.query.redirect || '/',
    retryInput: req.query.input || null
  });

  const params = querystring.stringify({
    client_id: CLIENT_ID,
    response_type: 'code',
    state: Buffer.from(state).toString('base64'),
    redirect_uri: REDIRECT_URI,
    duration: 'permanent',
    scope: 'identity history read'
  });

  res.redirect(`https://www.reddit.com/api/v1/authorize?${params}`);
};

exports.handleRedditCallback = async (req, res) => {
  const { code, state } = req.query;
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  let redirectTo = '/';
  let retryInput = null;

  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    if (decoded.redirectTo) redirectTo = decoded.redirectTo;
    if (decoded.retryInput) retryInput = decoded.retryInput;
  } catch (e) {
    console.warn('State decoding failed:', e.message);
  }

  try {
    const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const meRes = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'SocialSentrix/1.0'
      }
    });
    const meData = await meRes.json();
    const currentUsername = meData.name.toLowerCase();

    const userID = req.cookies.userID;
    if (userID) {
      const db = getDb();
      const accounts = db.collection(dbAccounts);
    
      const userAccount = await accounts.findOne({ id: userID });
    
      if (userAccount) {
        const ownedProfileIndex = userAccount.ownedProfiles?.findIndex(
          (p) => p.platform === 'reddit' && p.user === currentUsername
        );
        
        if (ownedProfileIndex === -1 || ownedProfileIndex === undefined) {
          await accounts.updateOne(
            { id: userID },
            {
              $push: {
                ownedProfiles: {
                  platform: 'reddit',
                  user: currentUsername,
                  reddit_token: accessToken
                }
              }
            }
          );
        } else {
          const profileKey = `ownedProfiles.${ownedProfileIndex}.reddit_token`;
          await accounts.updateOne(
            { id: userID },
            { $set: { [profileKey]: accessToken } }
          );
        }
        
      }
    }    

    const redirectUrl = retryInput
      ? `${redirectTo}?input=${encodeURIComponent(retryInput)}`
      : redirectTo;

    res.redirect(redirectUrl);
  } catch (err) {
    console.error('❌ OAuth error:', err);
    res.status(500).json({ error: 'OAuth failed', details: err.message });
  }
};

exports.getRedditSession = (req, res) => {
  const token = req.cookies.reddit_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ token });
};
