const express = require('express');
const { getDb, dbAccounts, dbPendingRequests } = require('../../services/mongo');
const nodemailer = require('nodemailer');
const router = express.Router();


router.get('/check-session-permission', async (req, res) => {
  try {
    const { sessionID, userID } = req.cookies;
    if (!sessionID || !userID) {
      return res.json({ isAdmin: false });
    }
    const db = getDb();
    const account = await db.collection(dbAccounts).findOne({ id: userID });
    if (!account) {
      res.json({ isAdmin: false });
    }

    const isAdmin = account?.adminSessions?.includes(sessionID);
    res.json({ isAdmin: !!isAdmin });
  }
  catch (err) {
    console.error('❌ Error in /check-session-permission:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/get-sessions', async (req, res) => {
  try {
    const { sessionID, userID } = req.cookies;
    const db = getDb();
    const accountsCol = db.collection(dbAccounts);
    const requestsCol = db.collection(dbPendingRequests);

    const account = await accountsCol.findOne({ id: userID, adminSessions: sessionID }, { projection: { email: 1 } });
    if (!account) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const sessions = await requestsCol.find({ email: account.email }).toArray();
    const mapped = sessions.map(request => ({
      sessionID: request.sessionID,
      name: request.name,
      comment: request.comment,
      status: request.status,
      userAgent: request.userAgent,
      ip: request.ip,
      location: request.location,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('❌ Error in /get-sessions:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.post('/request-session-admin', async (req, res) => {
  try {
    const { sessionID, userID } = req.cookies;
    const db = getDb();
    const accountsCol = db.collection(dbAccounts);

    const account = await accountsCol.findOne({ id: userID }, { projection: { email: 1 } });
    if (!account) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const confirmationUrl = `${process.env.VITE_API_URL}/api/mongodb/grant-session-admin?userID=${userID}&sessionID=${sessionID}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: '"SocialSentrix" <noreply@socialsentrix.com>',
      to: account.email,
      subject: 'Admin access request',
      html: `
        <h2>Hi there!</h2>
        <h3>Please confirm if you would like to give admin access to the session <i>${sessionID}</i>.</h3>
        <a href="${confirmationUrl}" style="margin: 0 15px; padding: 15px; background: #4a1e96; color: white; border-radius: 4px; text-decoration: none; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">Grant Admin Access</a>
        <h4 style="color:red; margin: 35px 0;">If you do not want to grant admin access, please ignore this email.</h4>
      `
    });

    return res.status(200).json({ message: 'Confirmation email sent.' });

  } catch (err) {
    console.error('❌ Error in /request-session-admin:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


function sendRedirect(res, code, messageArray) {
  return res.redirect(
    `${process.env.VITE_FRONTEND_URL}/parse?code=${code}&message=${encodeURIComponent(messageArray.join('\n'))}`
  );
}

router.get('/grant-session-admin', async (req, res) => {
  try {
    const { userID, sessionID } = req.query;

    if (!userID || !sessionID) {
      sendRedirect(res, '400', ['⛔ Missing userID or sessionID.']);
    }

    const db = getDb();
    const accountsCol = db.collection(dbAccounts);

    const account = await accountsCol.findOne({ id: userID });
    if (!account) {
      sendRedirect(res, '404', ['⛔ User not found.']);
    }

    const alreadyGranted = account.adminSessions?.includes(sessionID);
    if (alreadyGranted) {
      sendRedirect(res, '200', ['✅ Admin access was already granted to this session.']);
    }

    await accountsCol.updateOne(
      { id: userID },
      { $addToSet: { adminSessions: sessionID } }
    );

    sendRedirect(res, '200', ['✅ Admin Access Granted.', `Session ${sessionID} now has admin access.`]);
  } catch (err) {
    console.error('❌ Error in /grant-session-admin:', err);
    sendRedirect(res, '500', ['❌ Internal server error.']);
  }
});


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

    const isOwnSession = sessionID === cookieSession;
    if (isOwnSession) {
      res.clearCookie('sessionID', { path: '/', httpOnly: true, sameSite: 'Lax' });
      res.clearCookie('userID', { path: '/', httpOnly: true, sameSite: 'Lax' });
    }

    res.json({ message: `Deleted session ${sessionID}`, isOwnSession });
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