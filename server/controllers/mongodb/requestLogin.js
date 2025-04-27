const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, dbAccounts, dbPendingRequests } = require('../../services/mongo');
const nodemailer = require('nodemailer');
const useragent = require('useragent');
const geoip = require('geoip-lite');
const router = express.Router();

router.post('/', async (req, res) => {
  const { email, name, comment } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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

    const expiresAtTime = expiresAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
    
    const expiresAtDate = expiresAt.toLocaleDateString('en-GB');
    const expiresAtString = `${expiresAtTime} on ${expiresAtDate}`;

    const agent = useragent.parse(req.headers['user-agent']);
    const geo = geoip.lookup(ip) || {};

    const requestDoc = {
      sessionID,
      email: email.toLowerCase(),
      name,
      comment: comment || '',
      ip,
      userAgent: agent.toString(),
      location: `${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}`,
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
    console.error('❌ Login request error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
