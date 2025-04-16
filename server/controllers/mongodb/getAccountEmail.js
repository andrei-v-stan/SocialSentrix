const express = require('express');
const connectMongo = require('../../services/mongo');
const router = express.Router();

router.get('/get-account-email', async (req, res) => {
  const { userID } = req.query;
  console.log(userID)
  if (!userID) return res.status(400).json({ error: 'Missing userID.' });

  try {
    const db = await connectMongo();
    const user = await db
      .collection(process.env.MONGO_COLLECTION_ACCOUNTS)
      .findOne({ id: userID });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ email: user.email });
  } catch (err) {
    console.error('Error fetching email:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
