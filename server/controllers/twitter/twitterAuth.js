const puppeteer = require('puppeteer');
const { getDb, dbAccounts } = require('../../services/mongo');

exports.authTwitterProfile = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password.' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[name="text"]');
    await page.type('input[name="text"]', username);
    await page.keyboard.press('Enter');

    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    await page.type('input[name="password"]', password);
    await page.keyboard.press('Enter');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    const cookies = await page.cookies();
    const authToken = cookies.find(c => c.name === 'auth_token')?.value;
    const ct0 = cookies.find(c => c.name === 'ct0')?.value;

    if (!authToken || !ct0) {
      return res.status(401).json({ error: 'Login failed or session cookies not found.' });
    }

    const normalizedUsername = username.toLowerCase();
    const userID = req.cookies.userID;

    if (userID) {
      const db = getDb();
      const accounts = db.collection(dbAccounts);
      const userAccount = await accounts.findOne({ id: userID });

      const ownedProfileIndex = userAccount?.ownedProfiles?.findIndex(
        (p) => p.platform === 'twitter' && p.user === normalizedUsername
      );

      if (ownedProfileIndex === -1 || ownedProfileIndex === undefined) {
        await accounts.updateOne(
          { id: userID },
          {
            $push: {
              ownedProfiles: {
                platform: 'twitter',
                user: normalizedUsername,
                auth_token: authToken,
                ct0: ct0
              }
            }
          }
        );
      } else {
        await accounts.updateOne(
          { id: userID },
          {
            $set: {
              [`ownedProfiles.${ownedProfileIndex}.auth_token`]: authToken,
              [`ownedProfiles.${ownedProfileIndex}.ct0`]: ct0
            }
          }
        );
      }
    }

    res.json({ success: true, handle: normalizedUsername });
  } catch (err) {
    console.error('❌ Twitter login error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Twitter.' });
  } finally {
    if (browser) await browser.close();
  }
};
