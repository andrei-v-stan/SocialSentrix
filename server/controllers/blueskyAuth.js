const fetch = require('node-fetch');

exports.authBlueskyProfile = async (req, res) => {
  const { username, password } = req.body;
  console.log('Bluesky login attempt:', username);
  console.log('Bluesky login attempt:', password);

  try {
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username, password }),
    });

    const data = await response.json();

    if (data.accessJwt) {
      res.json({ token: data.accessJwt, handle: data.handle });
      console.log('Bluesky login successful:', data.handle, data.accessJwt);
    } else {
      res.status(401).json({ error: 'Invalid credentials or API error.' });
    }
  } catch (err) {
    console.error('Bluesky login error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Bluesky.' });
  }
};

