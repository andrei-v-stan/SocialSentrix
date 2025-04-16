const express = require('express');
const connectMongo = require('../../services/mongo');

const router = express.Router();

router.get('/confirm-login', async (req, res) => {
  const { sessionID } = req.query;

  if (!sessionID) {
    return res.status(400).send('Missing session ID.');
  }

  try {
    const db = await connectMongo();
    const requestsCol = db.collection(process.env.MONGO_COLLECTION_PENDING_REQUESTS);

    const request = await requestsCol.findOne({ sessionID });

    if (!request) {
      return res.status(404).send('Login request not found or already processed.');
    }

    const now = new Date();
    const expired = now > new Date(request.expiresAt);

    if (expired) {
      await requestsCol.deleteOne({ sessionID });
      return res.status(410).send('Login request has expired.');
    }

    if (request.status === 'Confirmed') {
      return res.send('<h2>✅ This login has already been confirmed</h2>');
    }

    if (request.status === 'Denied') {
      return res.send('<h2>❌ This login request has been denied</h2>');
    }

    await requestsCol.updateOne(
      { sessionID },
      { $set: { status: 'Confirmed' } }
    );

    return res.send(`
      <h1>✅ Login Approved</h1>
      <h2>The login request has been confirmed.</h2>
      <h2>The original requester will be logged in shortly.</h2>
    `);
  } catch (err) {
    console.error('Login confirmation error:', err);
    return res.status(500).send('Internal server error.');
  }
});

router.get('/deny-login', async (req, res) => {
  const { sessionID } = req.query;

  if (!sessionID) {
    return res.status(400).send('Missing session ID.');
  }

  try {
    const db = await connectMongo();
    const requestsCol = db.collection(process.env.MONGO_COLLECTION_PENDING_REQUESTS);

    const request = await requestsCol.findOne({ sessionID });

    if (!request) {
      return res.status(404).send('Login request not found or already processed.');
    }

    const now = new Date();
    const expired = now > new Date(request.expiresAt);

    if (expired) {
      await requestsCol.deleteOne({ sessionID });
      return res.status(410).send('Login request has expired.');
    }

    if (request.status === 'Denied') {
      return res.send('<h2>❌ This login request has already been denied</h2>');
    }

    if (request.status === 'Confirmed') {
      return res.send('<h2>✅ This login was already approved</h2>');
    }

    await requestsCol.updateOne(
      { sessionID },
      { $set: { status: 'Denied' } }
    );

    return res.send(`
      <h1>❌ Login Denied</h1>
      <h2>You have denied the login request.</h2>
      <h2>The requester will be notified and prevented from logging in.</h2>
    `);
  } catch (err) {
    console.error('Login denial error:', err);
    return res.status(500).send('Internal server error.');
  }
});


router.delete('/delete-login-request', async (req, res) => {
  const sessionID = req.cookies.sessionID;
  if (!sessionID) return res.status(400).json({ error: 'Missing sessionID cookie.' });

  try {
    const db = await connectMongo();
    const col = db.collection(process.env.MONGO_COLLECTION_PENDING_REQUESTS);
    await col.deleteOne({ sessionID });

    res.clearCookie('sessionID', {
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    });

    return res.status(200).json({ message: 'Login request deleted and cookie cleared.' });
  } catch (err) {
    console.error('Delete request error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;
