const express = require('express');
const { getDb, dbAccounts, dbPendingRequests } = require('../../services/mongo');
const router = express.Router();

router.delete('/delete-sessions-by-status', async (req, res) => {
  try {
    const { sessionID, userID } = req.cookies;
    const { status } = req.query;

    if (!status) return res.status(400).json({ error: 'Missing status parameter.' });

    const db = getDb();
    const accountsCol = db.collection(dbAccounts);
    const requestsCol = db.collection(dbPendingRequests);

    const account = await accountsCol.findOne({ id: userID, adminSessions: sessionID }, { projection: { email: 1 } });
    if (!account) return res.status(403).json({ error: 'Not authorized' });

    const result = await requestsCol.deleteMany({ email: account.email, status });
    res.json({ message: `Deleted ${result.deletedCount} sessions with status "${status}".` });
  } catch (err) {
    console.error('❌ Error in /delete-sessions-by-status:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/delete-session/:sessionID', async (req, res) => {
  try {
    const { sessionID: cookieSession, userID } = req.cookies;
    const { sessionID } = req.params;

    const db = getDb();
    const accountsCol = db.collection(dbAccounts);
    const requestsCol = db.collection(dbPendingRequests);

    const account = await accountsCol.findOne({ id: userID, adminSessions: cookieSession }, { projection: { email: 1 } });
    if (!account) return res.status(403).json({ error: 'Not authorized' });

    const result = await requestsCol.deleteOne({ sessionID, email: account.email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Session not found or already deleted.' });
    }

    res.json({ message: `Deleted session ${sessionID}` });
  } catch (err) {
    console.error('❌ Error in /delete-session/:sessionID:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.get('/get-admin-sessions', async (req, res) => {
  try {
    const { userID } = req.cookies;
    const db = getDb();
    const account = await db.collection(dbAccounts).findOne({ id: userID }, { projection: { adminSessions: 1 } });

    if (!account) return res.status(404).json({ error: 'User not found' });
    res.json({ adminSessions: account.adminSessions || [] });
  } catch (err) {
    console.error('❌ Error in /get-admin-sessions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.delete('/remove-session-admin', async (req, res) => {
  try {
    const { sessionID, userID } = req.cookies;
    const db = getDb();
    const accountsCol = db.collection(dbAccounts);

    const result = await accountsCol.updateOne(
      { id: userID },
      { $pull: { adminSessions: sessionID } }
    );

    if (result.modifiedCount > 0) {
      return res.status(200).json({ message: `Admin access removed from session ${sessionID}.` });
    } else {
      return res.status(400).json({ error: 'Session was not an admin session or already removed.' });
    }
  } catch (err) {
    console.error('❌ Error in /remove-session-admin:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;