const express = require('express');
const { getDb, dbAccounts } = require('../../services/mongo');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { userID } = req.query;
    
    if (!userID) {
      return res.status(400).json({ error: 'Missing userID.' });
    }

      const db = getDb();
      const user = await db.collection(dbAccounts).findOne({ id: userID });

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      return res.status(200).json({ email: user.email });
  } catch (err) {
    console.error('❌ Error fetching email:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
