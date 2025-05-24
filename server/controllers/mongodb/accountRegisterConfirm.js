const express = require('express');
const { getDb, dbAccounts, dbPendingRequests, dbPendingConfirmations } = require('../../services/mongo');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

router.post('/register-account', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const db = getDb();

        const cleanEmail = email.toLowerCase().trim();
        const existing = await db.collection(dbAccounts).findOne({ email: cleanEmail });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const token = uuidv4();
        const createdAt = new Date();
        await db.collection(dbPendingConfirmations).insertOne({
            token,
            email: cleanEmail,
            createdAt
        });


        const confirmationUrl = `${process.env.VITE_API_URL}/api/mongodb/confirm-account?token=${token}`;
        const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
        const expiresAtString = expiresAt.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_HOST,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: '"SocialSentrix" <noreply@socialsentrix.com>',
            to: cleanEmail,
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
        console.error('❌ Error in /register-account:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


function sendRedirect(res, code, messageArray) {
    return res.redirect(
        `${process.env.VITE_FRONTEND_URL}/parse?code=${code}&message=${encodeURIComponent(messageArray.join('\n'))}`
    );
}

router.get('/confirm-account', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        sendRedirect(res, '400', ['⛔ Missing confirmation token.']);
    }

    try {
        const db = getDb();
        const pendingCol = db.collection(dbPendingConfirmations);
        const accountsCol = db.collection(dbAccounts);

        const pending = await pendingCol.findOne({ token });
        if (!pending) {
            sendRedirect(res, '404', ['⚠️ Confirmation token not found or already used.']);
        }

        const createdAt = new Date(pending.createdAt);
        const now = new Date();
        if ((now - createdAt) > (60 * 60 * 1000)) {
            await pendingCol.deleteOne({ token });
            sendRedirect(res, '410', ['❌ The confirmation link has expired.', 'Please register again.']);
        }

        const newAccount = {
            id: uuidv4(),
            email: pending.email,
            creationDate: now,
            adminSessions: [],
            associatedProfiles: [],
            ownedProfiles: [],
        };

        await accountsCol.insertOne(newAccount);
        await pendingCol.deleteOne({ token });

        sendRedirect(res, '200', ['✅ Account Confirmed!', '', 'Your SocialSentrix account has been successfully created.', 'You can now log in and start analyzing profiles.']);
    } catch (err) {
        console.error('❌ Error in /confirm-account:', err);
        sendRedirect(res, '500', ['❌ Internal server error.']);
    }
});


module.exports = router;
