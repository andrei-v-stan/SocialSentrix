const express = require('express');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const connectMongo = require('../../services/mongo');

const router = express.Router();

router.post('/register-account', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const db = await connectMongo();

    const existing = await db.collection(process.env.MONGO_COLLECTION_ACCOUNTS).findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const token = uuidv4();
    const createdAt = new Date();
    
    await db.collection(process.env.MONGO_COLLECTION_PENDING_CONFIRMATIONS).insertOne({
      token,
      email: email.toLowerCase().trim(),
      createdAt
    });

    const confirmationUrl = `${process.env.VITE_API_URL}/api/mongodb/confirm-account?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_PASS,
      },
    });

    const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
    const expiresAtString = expiresAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    await transporter.sendMail({
      from: '"SocialSentrix" <noreply@socialsentrix.com>',
      to: email,
      subject: 'Confirm your SocialSentrix account',
      html: `
        <h2>Hi there!</h2>
        <h3>Please confirm your account by clicking the button below.</h3>
        <h3 style="margin-bottom: 35px;">
          <span style="font-weight: bold; font-size: 0.9em;">
            (This link will expire at ${expiresAtString})
          </span>
        </h3>
        <a href="${confirmationUrl}" style="margin: 0 15px; padding: 15px; background: #1e4396; color: white; border-radius: 4px; text-decoration: none; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">Confirm My Account</a>
        <h4 style="color:red; margin: 35px 0;">If you did not initiate this request, please ignore this email.</h4>
      `    
    });

    return res.status(200).json({ message: 'Confirmation email sent.' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
