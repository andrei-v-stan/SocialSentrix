const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { getDb, dbAccounts } = require('../../services/mongo');
const querystring = require('querystring');

const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDDIT_REDIRECT_URI;

/*
 const crypto = require('crypto');
 const ENCRYPTION_KEY = Buffer.from('$0c1@l$entr1xF!!'.padEnd(32, '#'));
 const IV_LENGTH = 16;
 function encryptToken(token) {
   const iv = crypto.randomBytes(IV_LENGTH);
   const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
   let encrypted = cipher.update(token, 'utf8', 'hex');
   encrypted += cipher.final('hex');
   return iv.toString('hex') + ':' + encrypted;
 }
*/

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

  const fullURL = `https://www.reddit.com/api/v1/authorize?${params}`;

  if (req.headers.accept?.includes('application/json')) {
    return res.json({ url: fullURL });
  } else {
    return res.redirect(fullURL);
  }
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
    // const encryptedToken = encryptToken(accessToken);

    const meRes = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'SocialSentrixBot/1.0 (by u/SocialSentrix)'
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

        if (ownedProfileIndex === -1) {
          await accounts.updateOne(
            { id: userID },
            {
              $push: {
                ownedProfiles: {
                  platform: 'reddit',
                  user: currentUsername,
                  reddit_token: accessToken
                  // Replace 'accessToken' with 'encryptedToken'
                }
              }
            }
          );
        } else {
          const profileKey = `ownedProfiles.${ownedProfileIndex}.reddit_token`;
          await accounts.updateOne(
            { id: userID },
            {
              $set: {
                [profileKey]: accessToken
                // Replace 'accessToken' with 'encryptedToken'
              }
            }
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
