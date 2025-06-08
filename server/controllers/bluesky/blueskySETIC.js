const { getDb, dbProfiles, dbAccounts } = require('../../services/mongo');
const vader = require('vader-sentiment');


async function calculateBlueskySETIC({ guest, owner, handle, startDate, endDate }) {
  const posts = guest.posts || [];
  const comments = guest.comments || [];
  const reposts = guest.reposts || [];
  const likes = owner?.likes || [];

  const followerCount = guest.followerCount || 0;
  const followingCount = guest.followingCount || 0;

  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();

  const S = blueskySentiment(posts, comments, start, end);
  const E = blueskyEngagement(posts, comments, reposts, followerCount, start, end);
  const T = blueskyTrustworthiness(followerCount, followingCount, posts.length, handle);
  const I = blueskyInfluence(posts, reposts, likes, followerCount, start, end);
  const C = blueskyConsistency(posts, comments, reposts, start, end);

  const R = Math.round(0.20 * S.score + 0.25 * E.score + 0.20 * T.score + 0.20 * I.score + 0.15 * C.score);
  return { S, E, T, I, C, R };
}


function getSentimentLabel(score, n) {
  const sRanges = [
    { min: 75, label: 'Very Positive' },
    { min: 56, label: 'Positive' },
    { min: 55, label: 'Neutral' },
    { min: 45, label: 'Neutral' },
    { min: 25, label: 'Negative' },
    { min: 0, label: 'Very Negative' }
  ];

  if (n < 5) return 'N/A';
  if (score === 50) return 'True Neutral';
  for (const range of sRanges) {
    if (score >= range.min) return range.label;
  }
  return 'N/A';
}

function blueskySentiment(posts, comments, start, end) {
  const filteredPosts = posts.filter(p => {
    const date = new Date(p.createdAt);
    return date >= start && date <= end;
  });

  const filteredComments = comments.filter(c => {
    const date = new Date(c.createdAt);
    return date >= start && date <= end;
  });

  const postTexts = filteredPosts.map(p => p.text || '').filter(t => t.trim());
  const commentTexts = filteredComments.map(c => c.text || '').filter(t => t.trim());

  const items = [...postTexts, ...commentTexts];
  const N = items.length;

  if (N === 0) {
    return {
      score: 0,
      engagementRatio: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      totalCount: 0
    };
  }

  const sentiments = items.map(text =>
    vader.SentimentIntensityAnalyzer.polarity_scores(text).compound
  );
  const postSentiments = postTexts.map(text =>
    vader.SentimentIntensityAnalyzer.polarity_scores(text).compound
  );
  const commentSentiments = commentTexts.map(text =>
    vader.SentimentIntensityAnalyzer.polarity_scores(text).compound
  );

  let avg = sentiments.reduce((a, b) => a + b, 0) / N;
  if (N < 5) avg = (avg * N) / 5;

  const score = Math.max(0, Math.min(100, Math.round((avg + 1) * 50)));

  const avgPosts = postSentiments.length
    ? Math.round(((postSentiments.reduce((a, b) => a + b, 0) / postSentiments.length + 1) * 50))
    : null;

  const avgComments = commentSentiments.length
    ? Math.round(((commentSentiments.reduce((a, b) => a + b, 0) / commentSentiments.length + 1) * 50))
    : null;

  return {
    score,
    label: getSentimentLabel(score, N),
    avgPosts,
    avgComments,
    n: N
  };
}


function blueskyEngagement(posts, comments, reposts, followerCount = 0, start, end) {
  const allContent = [...posts, ...comments, ...reposts].filter(p => {
    const date = new Date(p.createdAt);
    return date >= start && date <= end;
  });

  const totalCount = allContent.length;
  if (totalCount === 0) {
    return {
      score: 0,
      engagementRatio: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      totalCount: 0
    };
  }

  let likes = 0, replies = 0, repostsCount = 0;
  for (const item of allContent) {
    likes += item.likeCount || 0;
    replies += item.replyCount || 0;
    repostsCount += item.repostCount || 0;
  }

  const engagementTotal = likes + replies + repostsCount;
  const engagementRatio = engagementTotal / totalCount;

  const safeRatio = Math.max(engagementRatio, 0.01);
  const sigmoid = x => 100 / (1 + Math.exp(-8 * (x - 0.2)));
  const score = Math.round(sigmoid(safeRatio));

  return {
    score,
    engagementRatio: Math.round(engagementRatio * 10000) / 10000,
    likes,
    replies,
    reposts: repostsCount,
    totalCount
  };
}



function blueskyTrustworthiness(followerCount = 0, followingCount = 0, postCount = 0, handle = '') {
  const followerScore = followerCount > 0 ? Math.min(50, Math.round(Math.log10(followerCount + 1) * 10)) : 0;
  const followRatio = followerCount && followingCount ? followerCount / (followingCount + 1) : 1;
  const ratioScore = Math.min(30, Math.round(followRatio * 10));
  const activityBonus = postCount >= 10 ? 10 : postCount >= 5 ? 5 : 0;

  let baseScore = 0, isExternalDomain = false;
  if (handle == "bsky.app") {
    baseScore = 100;
    isExternalDomain = true;
  }
  else {
    baseScore = followerScore + ratioScore + activityBonus;
    isExternalDomain = handle && !handle.endsWith('.bsky.social');
    if (isExternalDomain) baseScore = Math.round(baseScore * 1.5);
  }

  return {
    score: Math.min(100, baseScore),
    followerCount,
    followingCount,
    externalDomain: isExternalDomain
  };
}

function blueskyInfluence(posts, reposts, likes, followerCount = 0, start, end) {
  const filteredContent = [...posts, ...reposts].filter(p => {
    const date = new Date(p.createdAt);
    return date >= start && date <= end;
  });

  const totalLikes = filteredContent.reduce((sum, p) => sum + (p.likeCount || 0), 0);
  const totalReposts = filteredContent.reduce((sum, p) => sum + (p.repostCount || 0), 0);
  const contentCount = filteredContent.length;

  const avgImpact = contentCount > 0 ? (totalLikes + totalReposts) / contentCount : 0;
  const impactScore = Math.min(40, Math.round(Math.log2(avgImpact + 1) * 10));
  const followerScore = Math.min(40, Math.round(Math.log10(followerCount + 1) * 10));
  const likedViral = (likes || []).filter(p => (p.likeCount || 0) > 1000).length;
  const viralBonus = Math.min(10, likedViral * 2);

  const score = Math.min(100, impactScore + followerScore + viralBonus);

  return {
    score,
    contentCount,
    totalLikes,
    totalReposts,
    avgImpact: Math.round(avgImpact * 100) / 100,
    followerCount,
    followerScore,
    impactScore,
  };
}


function blueskyConsistency(posts, comments, reposts, start, end) {
  const dates = [...posts, ...comments, ...reposts]
    .map(p => new Date(p.createdAt))
    .filter(d => !isNaN(d) && d >= start && d <= end)
    .sort((a, b) => a - b);

  if (!dates.length) {
  return {
    score: 0,
    activitySpan: null,
    totalWeeks: 0,
    activeWeeks: 0,
    inactiveWeeks: 0,
    cv: null,
    lastActive: null
  };
}

  const weekBuckets = {};
  for (const date of dates) {
    const year = date.getUTCFullYear();
    const week = Math.floor((date - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24 * 7));
    const key = `${year}-W${week}`;
    weekBuckets[key] = (weekBuckets[key] || 0) + 1;
  }

  const weeklyCounts = Object.values(weekBuckets);
  const mean = weeklyCounts.reduce((a, b) => a + b, 0) / weeklyCounts.length;
  const stdDev = Math.sqrt(weeklyCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / weeklyCounts.length);
  const cv = stdDev / (mean || 1);

  const totalWeeks = Math.max(1, Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24 * 7)));
  const inactiveWeeks = totalWeeks - weeklyCounts.length;

  let score = 100;
  if (cv > 1) score -= Math.min(30, Math.round((cv - 1) * 25));
  if (inactiveWeeks > 0) score -= Math.min(30, Math.round((inactiveWeeks / totalWeeks) * 100));
  if (mean >= 1 && mean <= 5) score += 5;

  const now = new Date();
  const lastActivity = dates[dates.length - 1];
  const monthsSinceLast = (now - lastActivity) / (1000 * 60 * 60 * 24 * 30.44);

  if (monthsSinceLast >= 12) score -= 20;
  else if (monthsSinceLast >= 6) score -= 10;
  else if (monthsSinceLast >= 3) score -= 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    activitySpan: {
      start: dates[0].toISOString(),
      end: dates[dates.length - 1].toISOString()
    },
    totalWeeks,
    activeWeeks: Object.keys(weekBuckets).length,
    inactiveWeeks,
    cv,
    lastActive: lastActivity.toISOString()
  };
}


exports.getBlueskySETIC = async (req, res) => {
  const { username, start, end, userID: userIDFromBody } = req.query;
  const userID = req.cookies.userID || userIDFromBody;

  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const db = getDb();
    const profile = await db.collection(dbProfiles).findOne({ platform: 'bluesky', username: username.toLowerCase() });
    if (!profile?.guestView) return res.status(404).json({ error: 'Profile not found. Please submit it first.' });

    const guest = profile.guestView;
    let owner = null;

    if (userID) {
      const account = await db.collection(dbAccounts).findOne({ id: userID });
      const owned = account?.ownedProfiles?.find(p => p.platform === 'bluesky' && p.user === username.toLowerCase());
      if (owned) {
        owner = profile.ownerView || null;
      }
    }

    const seticScores = await calculateBlueskySETIC({
      guest,
      owner,
      handle: profile.username,
      startDate: start,
      endDate: end
    });

    res.json(seticScores);
  } catch (err) {
    console.error('Bluesky SETIC error:', err);
    res.status(500).json({ error: 'Failed to calculate SETIC' });
  }
};