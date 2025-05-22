const { getDb, dbProfiles } = require('../../services/mongo');
const vader = require('vader-sentiment');

async function calculateSETIC(username) {
    const db = getDb();
    const profilesCol = db.collection(dbProfiles);
  
    const profile = await profilesCol.findOne({ platform: 'reddit', username });
    if (!profile || !profile.guestView) {
      throw new Error('Profile data not found');
    }
  
    const posts = profile.guestView.posts || [];
    const comments = profile.guestView.comments || [];
    const aboutMeta = profile.guestView.about || {};
    const subredditMeta = profile.guestView.subreddit || {};
  
    const S = calculateSentiment(posts, comments);
    const E = await calculateEngagement(posts);
    const T = calculateTrustworthiness(profile.guestView);
    const I = calculateInfluence(subredditMeta, aboutMeta);
    const C = calculateConsistency(posts, comments);
  
    const safeS = isNaN(S) ? 50 : S;
    const R = Math.round(0.25 * safeS + 0.25 * E + 0.2 * T + 0.2 * I + 0.1 * C);
  
    return { S: safeS, E, T, I, C, R };
  }
  

function calculateSentiment(posts, comments) {
  const items = [...posts, ...comments];
  if (items.length === 0) return 50;

  const weightedSentiments = items.map(item => {
    const text = (item.title || '') + ' ' + (item.text || '');
    if (text.trim() === '') return 0;
    const sentiment = vader.SentimentIntensityAnalyzer.polarity_scores(text).compound;
    const upvotes = item.upvotes || 0;
    return sentiment * Math.log(upvotes + 2);
  });

  const validSentiments = weightedSentiments.filter(x => !isNaN(x));
  if (validSentiments.length === 0) return items.length > 50 ? 10 : 50;

  const avgSentiment = validSentiments.reduce((sum, val) => sum + val, 0) / validSentiments.length;
  const rescaled = (avgSentiment + 1) * 50;
  return Math.max(0, Math.min(100, Math.round(rescaled)));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function fetchSubredditRecentStats(subreddit) {
    const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=100`;
  
    await sleep(1000);
  
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SocialSentrixBot/1.0 (by u/SocialSentrix)'
        }
      });
  
      if (res.status === 429) {
        console.warn(`Rate limited while fetching subreddit: ${subreddit}. Waiting and retrying.`);
        await sleep(3000);
        return fetchSubredditRecentStats(subreddit);
      }
  
      if (!res.ok) {
        console.error(`Error fetching subreddit ${subreddit}: ${res.status}`);
        return { avgUpvotes: 5, avgComments: 1 };
      }
  
      const data = await res.json();
      const posts = data.data?.children?.map(c => c.data) || [];
  
      if (!posts.length) {
        console.warn(`No posts found for subreddit: ${subreddit}`);
        return { avgUpvotes: 5, avgComments: 1 };
      }
  
      const totalUpvotes = posts.reduce((sum, p) => sum + (p.ups || 0), 0);
      const totalComments = posts.reduce((sum, p) => sum + (p.num_comments || 0), 0);
  
      return {
        avgUpvotes: totalUpvotes / posts.length,
        avgComments: totalComments / posts.length
      };
    } catch (err) {
      console.error(`Failed to fetch subreddit stats for ${subreddit}:`, err.message);
      return { avgUpvotes: 5, avgComments: 1 };
    }
  }
  
  
async function calculateEngagement(posts) {
    if (!posts.length) return 50;
  
    const subredditStatsCache = {};
  
    const normalizedScores = await Promise.all(posts.map(async post => {
      const subreddit = post.subreddit;
  
      if (!subreddit) return 1;
  
      if (!subredditStatsCache[subreddit]) {
        subredditStatsCache[subreddit] = await fetchSubredditRecentStats(subreddit);
      }
  
      const { avgUpvotes, avgComments } = subredditStatsCache[subreddit];
      const userEngagement = (post.upvotes || 0) + (post.comments || 0);
      const subredditEngagement = avgUpvotes + avgComments;
  
      return subredditEngagement > 0 ? userEngagement / subredditEngagement : 1;
    }));
  
    const avgNormalized = normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;
  
    return Math.min(100, Math.round(avgNormalized * 50));
  }
  


  function calculateTrustworthiness(guestView) {
    if (!guestView) return 25;
  
    let score = 0;

    const badges = guestView.badges || [];
    const trophies = guestView.trophies || [];
    const about = guestView.about || {};
    const cakeDay = guestView.cakeDay;
  
    const trustComponents = [
      { condition: badges.includes('Reddit Admin'), score: 100 },
      { condition: badges.length > 0, score: 10 },
      { condition: trophies.length > 0, score: 10 },
      { condition: about.has_verified_email, score: 25 },
      { condition: about.is_gold, score: 15 }
    ];
  
    score += trustComponents.reduce((sum, component) => sum + (component.condition ? component.score : 0), 0);
  
    if (cakeDay) {
      const accountAgeYears = (Date.now() - new Date(cakeDay).getTime()) / (1000 * 60 * 60 * 24 * 365);
      let ageBonus = 0;
  
      const thresholds = [
        { min: 15, bonus: 50 },
        { min: 10, bonus: 35 },
        { min: 7,  bonus: 25 },
        { min: 5,  bonus: 20 },
        { min: 3,  bonus: 15 },
        { min: 2,  bonus: 10 },
        { min: 1,  bonus: 5 }
      ];
  
      for (const { min, bonus } of thresholds) {
        if (accountAgeYears >= min) {
          ageBonus = bonus;
          break;
        }
      }
  
      score += ageBonus;
      console.log('Account Age Years:', accountAgeYears.toFixed(2), '-> Age Bonus:', ageBonus);
    }
  
    console.log('Final Trustworthiness Score:', score);
  
    return Math.min(100, Math.round(score));
  }
  
  
  
  

function calculateInfluence(subredditMeta, aboutMeta) {
  const totalKarma = (aboutMeta.karma?.total) || (aboutMeta.karma_total) || 
    ((aboutMeta.karma_comment || 0) + (aboutMeta.karma_post || 0)) || 
    ((aboutMeta.comment_karma || 0) + (aboutMeta.link_karma || 0)) || 0;

  let karmaInfluence = 0;
  if (totalKarma >= 100000) karmaInfluence = 80;
  else if (totalKarma >= 10000) karmaInfluence = 60;
  else if (totalKarma >= 1000) karmaInfluence = 40;
  else if (totalKarma >= 100) karmaInfluence = 20;
  else karmaInfluence = 10;

  let subsInfluence = 0;
  if (subredditMeta.moderatedSubs && Array.isArray(subredditMeta.moderatedSubs)) {
    const totalMembers = subredditMeta.moderatedSubs.reduce((sum, sub) => {
      let members = 0;
      if (typeof sub.members === 'string') {
        members = parseInt(sub.members.replace('M', '000000').replace('k', '000')) || 0;
      } else if (typeof sub.members === 'number') {
        members = sub.members;
      }
      return sum + members;
    }, 0);
    subsInfluence = Math.min(20, Math.log10(totalMembers + 1) * 5);
  }

  const influence = Math.min(100, Math.round(karmaInfluence + subsInfluence));
  return Math.max(0, influence);
}

function calculateConsistency(posts, comments) {
  const allDates = [...posts, ...comments]
    .map(item => new Date(item.createdAt))
    .filter(date => !isNaN(date));

  if (allDates.length === 0) return 50;

  const months = new Set(allDates.map(date => `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`));
  let consistency = Math.round((months.size / 12) * 100);

  const sortedDates = allDates.sort((a, b) => a - b);
  for (let i = 1; i < sortedDates.length; i++) {
    const gapMonths = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24 * 30);
    if (gapMonths > 6) {
      consistency -= 10;
    }
  }

  return Math.max(0, Math.min(100, consistency));
}

exports.getSETIC = async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const seticScores = await calculateSETIC(username.toLowerCase());
    console.log('Reddit User:', username);
    console.log('SETIC scores:', seticScores);
    res.json(seticScores);
  } catch (err) {
    console.error('SETIC calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate SETIC' });
  }
};
