const express = require('express');
const router = express.Router();
const { getDb, dbAccounts, dbProfiles, dbPendingConfirmations, dbPendingRequests } = require('../../services/mongo');

router.get('/clear-collections', async (req, res) => {
  try {
    const db = getDb();

    const collectionsToClear = [
      dbAccounts,
      dbProfiles,
      dbPendingConfirmations,
      dbPendingRequests
    ];

    for (const name of collectionsToClear) {
      const result = await db.collection(name).deleteMany({});
      console.log(`🧹 Cleared ${result.deletedCount} documents from ${name}`);
    }

    res.status(200).send('✅ Collections cleared.');
  } catch (error) {
    console.error('❌ Error clearing collections:', error);
    res.status(500).send('❌ Failed to clear collections.');
  }
});

module.exports = router;
