const express = require('express');
const connectMongo = require('../../services/mongo');

const router = express.Router();

router.get('/check-login-status', async (req, res) => {
  const sessionID = req.cookies.sessionID;

  if (!sessionID) {
    return res.status(400).json({ status: 'MissingSession' });
  }

  try {
    const db = await connectMongo();
    const requestsCol = db.collection(process.env.MONGO_COLLECTION_PENDING_REQUESTS);
    const accountsCol = db.collection(process.env.MONGO_COLLECTION_ACCOUNTS);

    const request = await requestsCol.findOne({ sessionID });

    if (!request) {
      return res.status(404).json({ status: 'Expired' });
    }

    const now = new Date();
    if (now > new Date(request.expiresAt)) {
      await requestsCol.deleteOne({ sessionID });
      return res.status(410).json({ status: 'Expired' });
    }

    if (request.status === 'Denied') {
      await requestsCol.deleteOne({ sessionID });
      return res.status(403).json({ status: 'Denied' });
    }

    if (request.status === 'Pending') {
      return res.status(200).json({ status: 'Pending' });
    }

    if (request.status === 'Confirmed') {
      const account = await accountsCol.findOne({ email: request.email });

      if (!account) {
        return res.status(404).json({ status: 'UserNotFound' });
      }


      res.cookie('userID', account.id, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 31536000000
      });

      await requestsCol.deleteOne({ sessionID });

      return res.status(200).json({ status: 'Confirmed', uuid: account.id });
    }

    return res.status(500).json({ status: 'UnknownError' });
  } catch (err) {
    console.error('Login status check failed:', err);
    return res.status(500).json({ status: 'Error' });
  }
});

module.exports = router;
