const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

function extractUsername(input) {
  const match = input.match(/(?:https?:\/\/)?(?:www\.)?twitter\.com\/(\w+)/i);
  return match ? match[1] : input.replace(/^@/, '');
}

exports.getTwitterProfile = async (req, res) => {
  const rawInput = req.body.username;
  const requesterID = req.cookies?.userID || null;
  const username = extractUsername(rawInput);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`https://twitter.com/${username}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('div[data-testid="UserProfileHeader_Items"]', { timeout: 10000 });

    const profileData = await page.evaluate(() => {
      const name = document.querySelector('div[data-testid="UserName"] span')?.innerText || '';
      const bio = document.querySelector('div[data-testid="UserDescription"]')?.innerText || '';
      const stats = document.querySelectorAll('div[data-testid="StatValue"]');
      const tweets = stats[0]?.innerText || '0';
      const following = stats[1]?.innerText || '0';
      const followers = stats[2]?.innerText || '0';

      return {
        name,
        bio,
        tweets,
        following,
        followers
      };
    });

    const posts = [];
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    for (let i = 0; i < 3; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2000);
      let newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === lastHeight) break;
      lastHeight = newHeight;
    }

    const tweets = await page.evaluate(() => {
      const data = [];
      const tweetNodes = document.querySelectorAll('article[data-testid="tweet"]');
      tweetNodes.forEach(node => {
        const content = node.innerText;
        const timestamp = node.querySelector('time')?.getAttribute('datetime');
        const views = node.querySelector('div[aria-label*="Views"]')?.innerText || '0';
        const likes = node.querySelector('div[aria-label*="Like"]')?.innerText || '0';
        const replies = node.querySelector('div[aria-label*="Reply"]')?.innerText || '0';
        const reposts = node.querySelector('div[aria-label*="Repost"]')?.innerText || '0';

        data.push({ content, timestamp, views, likes, replies, reposts });
      });
      return data;
    });

    await browser.close();

    const guestView = { ...profileData, posts: tweets };
    console.log('Extracted Twitter Data:', JSON.stringify(guestView, null, 2));

    res.json(true);
  } catch (err) {
    await browser.close();
    console.error('Error fetching Twitter profile:', err);
    res.status(500).json({ error: 'Unable to fetch profile', details: err.message });
  }
};
