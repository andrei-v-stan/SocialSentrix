const fetch = require('node-fetch');
const { getDb, dbAccounts } = require('../../services/mongo');

exports.authBlueskyProfile = async (req, res) => {
  const { username, password, userID: userIDFromBody } = req.body;
  const userID = req.cookies.userID || userIDFromBody;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username, password }),
    });

    const data = await response.json();

    if (!data.accessJwt || !data.handle || !data.did || !data.refreshJwt) {
      return res.status(401).json({ error: 'Invalid credentials or API error.' });
    }

    const { accessJwt, refreshJwt, handle, did } = data;
    const normalizedHandle = handle.toLowerCase();

    if (userID) {
      const db = getDb();
      const accounts = db.collection(dbAccounts);

      const userAccount = await accounts.findOne({ id: userID });
      if (userAccount) {
        const ownedProfileIndex = userAccount.ownedProfiles?.findIndex(
          (p) => p.platform === 'bluesky' && p.user === normalizedHandle
        );

        if (ownedProfileIndex === -1 || ownedProfileIndex === undefined) {
          await accounts.updateOne(
            { id: userID },
            {
              $push: {
                ownedProfiles: {
                  platform: 'bluesky',
                  user: normalizedHandle,
                  did: did,
                  token: accessJwt,
                  refresh: refreshJwt
                }
              }
            }
          );
        } else {
          await accounts.updateOne(
            { id: userID },
            {
              $set: {
                [`ownedProfiles.${ownedProfileIndex}.did`]: did,
                [`ownedProfiles.${ownedProfileIndex}.token`]: accessJwt,
                [`ownedProfiles.${ownedProfileIndex}.refresh`]: refreshJwt
              }
            }
          );
        }
      }
    }

    res.json({
      success: true,
      handle: normalizedHandle
    });
  } catch (err) {
    console.error('❌ Bluesky login error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Bluesky.' });
  }
};

