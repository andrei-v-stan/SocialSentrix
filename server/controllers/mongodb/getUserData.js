const express = require('express');
const { getDb, dbAccounts, dbPendingRequests } = require('../../services/mongo');
const router = express.Router();

router.get('/validate-cookies', async (req, res) => {
  try {
    const { sessionID, userID } = req.cookies;
    const db = getDb();

    switch (true) {
      case !!sessionID && !!userID: {
        const accountsCol = db.collection(dbAccounts);

        const account = await accountsCol.findOne({ id: userID });
        if (!account) {
          return res.json({ valid: false });
        }

        const requestsCol = db.collection(dbPendingRequests);
        const sessionStatus = await requestsCol.findOne({ sessionID: sessionID }, { projection: { status: 1 } });
        if (sessionStatus.status != "Confirmed") {
          return res.json({ valid: false });
        }

        return res.json({
          valid: true,
          email: account.email,
          userID,
          sessionID
        });
      }

      case !sessionID && !!userID:
        res.clearCookie('userID');
        return res.json({ valid: false });

      case !!sessionID && !userID:
        return res.json({ valid: false });

      default:
        return res.json({ valid: false });
    }
  } catch (err) {
    console.error('❌ Error in /validate-cookies:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


router.get('/get-user-profiles', async (req, res) => {
  try {
    const userID = req.cookies?.userID;
    const platform = req.query.platform.toLowerCase();

    if (!userID) {
      return res.status(401).json({ error: 'Unauthorized: No userID cookie found.' });
    }
    if (!platform) {
      return res.status(400).json({ error: 'Missing platform in query.' });
    }

    const db = getDb();
    const account = await db.collection(dbAccounts).findOne({ id: userID });

    if (!account) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    const extractUsernames = (arr) =>
      (arr || [])
        .filter(p => p.platform.toLowerCase() === platform.toLowerCase())
        .map(p => p.user);

    const ownedProfiles = extractUsernames(account.ownedProfiles);
    const associatedProfiles = extractUsernames(account.associatedProfiles);

    res.json({ ownedProfiles, associatedProfiles });
  } catch (err) {
    console.error('❌ Error in /get-user-profiles:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;