const express = require('express');
const { getDb, dbAccounts, dbPendingRequests } = require('../../services/mongo');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const useragent = require('useragent');
const geoip = require('geoip-lite');
const router = express.Router();


router.post('/request-login', async (req, res) => {
  const { email, name, comment } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required.' });
  }

  try {
    const db = getDb();
    const accountsCol = db.collection(dbAccounts);
    const requestsCol = db.collection(dbPendingRequests);

    const account = await accountsCol.findOne({ email: email.toLowerCase().trim() });
    if (!account) {
      return res.status(404).json({ error: 'Email is not registered.' });
    }

    const sessionID = uuidv4();

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
    const expiresAtDate = expiresAt.toLocaleDateString('en-GB');
    const expiresAtTime = expiresAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();

    const expiresAtString = `${expiresAtTime} on ${expiresAtDate}`;
    const agent = useragent.parse(req.headers['user-agent']);
    // const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    // const geo = geoip.lookup(ip) || {};

    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    const geo = geoip.lookup(ip);
    const location = geo ? `${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}` : 'Unknown';

    const requestDoc = {
      sessionID,
      email: email.toLowerCase(),
      name,
      comment: comment || '',
      userAgent: agent.toString(),
      ip,
      location,
      status: 'Pending',
      createdAt,
      expiresAt
    };

    await requestsCol.insertOne(requestDoc);

    const confirmUrl = `${process.env.VITE_API_URL}/api/mongodb/confirm-login?sessionID=${sessionID}`;
    const denyUrl = `${process.env.VITE_API_URL}/api/mongodb/deny-login?sessionID=${sessionID}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: '"SocialSentrix" <noreply@socialsentrix.com>',
      to: email,
      subject: `Login request by ${name}`,
      html: `
        <h2><i>${name}</i> requested to log in to SocialSentrix.</h2>
        <h3>Comment: <i>${comment || '(No comment)'}</i></h3>
        <h4>IP: <i>${ip}</i></h4>
        <h4>Location: <i>${requestDoc.location}</i></h4>
        <h4 style="margin-bottom:35px;">Device: <i>${requestDoc.userAgent}</i></h4>
        <a href="${confirmUrl}" style="margin: 0 15px; padding: 15px; background: #0a4203; color: white; border-radius: 4px; text-decoration: none; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">Approve Login</a>        
        <a href="${denyUrl}" style="padding: 15px; background: #420303; color: white; border-radius: 4px; text-decoration: none; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">Deny Login</a>
        <i><h4 style="color:red; margin:35px 0;">This link will expire at ${expiresAtString}</h4></i>
      `,
    });

    res.cookie('sessionID', sessionID, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 31536000000
    });

    return res.status(200).json({ message: 'Login request sent. Awaiting approval.' });
  } catch (err) {
    console.error('❌ Error in /request-login:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});



function sendRedirect(res, code, messageArray) {
  return res.redirect(
    `${process.env.VITE_FRONTEND_URL}/parse?code=${code}&message=${encodeURIComponent(messageArray.join('\n'))}`
  );
}

async function getLoginRequestOrError(req, res, db) {
  const { sessionID } = req.query;

  if (!sessionID) {
    return sendRedirect(res, '400', ['⛔ Missing session ID']);
  }

  const request = await db.collection(dbPendingRequests).findOne({ sessionID });
  if (!request) {
    return sendRedirect(res, '404', ['⚠️ Login request not found or already processed.']);
  }

  return { request, sessionID };
}

function checkRequestStatus(request, sessionID, requestsCol) {
  const now = new Date();
  const expired = now > new Date(request.expiresAt);

  switch (true) {
    case expired:
      return {
        code: '410',
        message: ['⚠️ Login request has expired and now has been deleted.'],
        action: () => requestsCol.deleteOne({ sessionID })
      };
    case request.status === 'Confirmed':
      return {
        code: '409',
        message: ['✅ This login was already approved.']
      };
    case request.status === 'Denied':
      return {
        code: '208',
        message: ['❌ This login request has already been denied.']
      };
    default:
      return null;
  }
}


router.get('/confirm-login', async (req, res) => {
  try {
    const db = getDb();
    const { request, sessionID } = await getLoginRequestOrError(req, res, db) || {};

    if (!request) return;

    const requestsCol = db.collection(dbPendingRequests);
    const statusResult = checkRequestStatus(request, sessionID, requestsCol);

    if (statusResult) {
      if (statusResult.action) await statusResult.action();
      return sendRedirect(res, statusResult.code, statusResult.message);
    }

    await requestsCol.updateOne({ sessionID }, { $set: { status: 'Confirmed' } });

    return sendRedirect(res, '200', [
      '✅ Login Approved',
      '',
      'The login request has been confirmed.',
      'The original requester will be logged in shortly.'
    ]);
  } catch (err) {
    console.error('❌ Error in /confirm-login:', err);
    return sendRedirect(res, '500', ['⛔ Internal server error during confirmation.']);
  }
});

router.get('/deny-login', async (req, res) => {
  try {
    const db = getDb();
    const { request, sessionID } = await getLoginRequestOrError(req, res, db) || {};

    if (!request) return;

    const requestsCol = db.collection(dbPendingRequests);
    const statusResult = checkRequestStatus(request, sessionID, requestsCol);

    if (statusResult) {
      if (statusResult.action) await statusResult.action();
      return sendRedirect(res, statusResult.code, statusResult.message);
    }

    await requestsCol.updateOne({ sessionID }, { $set: { status: 'Denied' } });

    return sendRedirect(res, '200', [
      '❌ Login Denied',
      '',
      'You have denied the login request.',
      'The requester will be notified and prevented from logging in.'
    ]);
  } catch (err) {
    console.error('❌ Error in /deny-login:', err);
    return sendRedirect(res, '500', ['⛔ Internal server error during denial.']);
  }
});


function clearSessionCookie(res) {
  res.clearCookie('sessionID', {
    path: '/',
    httpOnly: true,
    sameSite: 'Strict'
  });
}

router.get('/check-login-status', async (req, res) => {
  const sessionID = req.cookies.sessionID;

  if (!sessionID) {
    return res.status(400).json({ status: 'MissingSession' });
  }

  try {
    const db = getDb();
    const requestsCol = db.collection(dbPendingRequests);
    const accountsCol = db.collection(dbAccounts);

    const request = await requestsCol.findOne({ sessionID });

    if (!request) {
      clearSessionCookie(res);
      return res.status(404).json({ status: 'Expired' });
    }

    const now = new Date();
    if (now > new Date(request.expiresAt)) {
      await requestsCol.deleteOne({ sessionID });
      clearSessionCookie(res);
      return res.status(410).json({ status: 'Expired' });
    }

    if (request.status === 'Denied') {
      await requestsCol.deleteOne({ sessionID });
      clearSessionCookie(res);
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

      return res.status(200).json({ status: 'Confirmed', uuid: account.id });
    }
    return res.status(500).json({ status: 'UnknownError' });
  } catch (err) {
    console.error('❌ Error in /check-login-status:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

