const express = require('express');
const { v4: uuidv4 } = require('uuid');
const connectMongo = require('../../services/mongo');

const router = express.Router();

router.get('/confirm-account', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Missing confirmation token.');
  }

  try {
    const db = await connectMongo();
    const pendingCollection = db.collection(process.env.MONGO_COLLECTION_PENDING_CONFIRMATIONS);
    const accountsCollection = db.collection(process.env.MONGO_COLLECTION_ACCOUNTS);

    const pending = await pendingCollection.findOne({ token });

    if (!pending) {
      return res.status(404).send('<h2>❌ This confirmation link is invalid or has already been used.</h2>');
    }

    const now = new Date();
    const createdAt = new Date(pending.createdAt);
    const diff = now - createdAt;
    const oneHour = 60 * 60 * 1000;

    if (diff > oneHour) {
      await pendingCollection.deleteOne({ token });
      return res.status(410).send(`<h2>❌ The confirmation link has expired, please register again <a href="${process.env.VITE_API_URL}">here</a>.</h2>`);
    }

    const newAccount = {
      id: uuidv4(),
      email: pending.email,
      creationDate: now,
      associatedProfiles: [],
      ownedProfiles: []
    };

    await accountsCollection.insertOne(newAccount);
    await pendingCollection.deleteOne({ token });

    return res.send(`
      <h1>✅ Account Confirmed!</h1>
      <h2>Your SocialSentrix account has been successfully created.</h2>
      <h3>You can now <a href="${process.env.VITE_API_URL}">log in</a> and start analyzing profiles.</h3>
    `);
  } catch (err) {
    console.error('Account confirmation failed:', err);
    return res.status(500).send('Internal server error.');
  }
});

module.exports = router;
