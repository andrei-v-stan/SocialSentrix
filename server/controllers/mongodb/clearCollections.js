const express = require('express');
const router = express.Router();
const connectMongo = require('../../services/mongo');

router.get('/clear-collections', async (req, res) => {
  try {
    const db = await connectMongo();

    const collectionsToClear = [
        process.env.MONGO_COLLECTION_ACCOUNTS='accounts',
        process.env.MONGO_COLLECTION_PROFILES='profile',
        process.env.MONGO_COLLECTION_PENDING_CONFIRMATIONS='pending',
        process.env.MONGO_COLLECTION_PENDING_REQUESTS='requests'
      ];

    for (const name of collectionsToClear) {
      const result = await db.collection(name).deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${name}`);
    }

    res.status(200).send('✅ Collections cleared.');
  } catch (error) {
    console.error('Error clearing collections:', error);
    res.status(500).send('❌ Failed to clear collections.');
  }
});

module.exports = router;
