const express = require('express');
const { getDb, dbAccounts } = require('../../services/mongo');
const router = express.Router();

router.get('/', async (req, res) => {
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
    console.error('Error in /api/get-user-profiles:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;