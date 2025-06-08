const { getDb, dbProfiles, dbAccounts } = require('../../services/mongo');
const vader = require('vader-sentiment');

const DEFAULT_STATS = { avgUpvotes: 5, avgComments: 1 };
const BATCH_SIZE = 5;
const RATE_LIMITS = { authenticated: 60, unauthenticated: 20 };

async function calculateSETIC({ guest, ownedToken, startDate = null, endDate = null }) {
  const posts = guest.posts || [];
  const comments = guest.comments || [];

  const allTimestamps = [...posts, ...comments]
    .map(item => new Date(item.createdAt))
    .filter(date => !isNaN(date));

  const earliest = allTimestamps.length ? new Date(Math.min(...allTimestamps)) : new Date(0);
  const latest = allTimestamps.length ? new Date(Math.max(...allTimestamps)) : new Date();

  const start = startDate ? new Date(startDate) : earliest;
  const end = endDate ? new Date(endDate) : latest;

  const filteredPosts = posts.filter(p => new Date(p.createdAt) >= start && new Date(p.createdAt) <= end);
  const filteredComments = comments.filter(c => new Date(c.createdAt) >= start && new Date(c.createdAt) <= end);

  const S = calculateSentiment(filteredPosts, filteredComments);
  const E = await calculateEngagement(filteredPosts, filteredComments, ownedToken);
  const T = calculateTrustworthiness(guest);
  const I = calculateInfluence(guest);
  const C = calculateConsistency(filteredPosts, filteredComments);

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
    { min: 0, label: 'Very Negative' },
  ];

  if (n < 5) return 'N/A';
  if (score === 50) return 'True Neutral';
  for (const range of sRanges) {
    if (score >= range.min) return range.label;
  }
  return 'N/A';
}

function calculateSentiment(posts, comments) {
  const postTexts = posts.map(p => (p.title || '') + ' ' + (p.text || '')).filter(Boolean);
  const commentTexts = comments.map(c => c.text || '').filter(Boolean);
  const items = [...postTexts, ...commentTexts].filter(text => text && text.trim());

  const N = items.length;
  if (N === 0) {
    return {
      score: 50,
      label: 'N/A',
      avgPosts: null,
      avgComments: null,
      perSubreddit: {},
      n: 0,
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

  let avg = sentiments.reduce((sum, s) => sum + s, 0) / N;
  if (N < 5) avg = (avg * N) / 5;
  const score = Math.max(0, Math.min(100, Math.round((avg + 1) * 50)));

  const avgPosts = postSentiments.length
    ? Math.round(((postSentiments.reduce((a, b) => a + b, 0) / postSentiments.length + 1) * 50))
    : null;
  const avgComments = commentSentiments.length
    ? Math.round(((commentSentiments.reduce((a, b) => a + b, 0) / commentSentiments.length + 1) * 50))
    : null;

  const subredditGroups = {};
  posts.forEach((p, i) => {
    if (p.subreddit) {
      subredditGroups[p.subreddit] = subredditGroups[p.subreddit] || { sentiments: [], count: 0 };
      subredditGroups[p.subreddit].sentiments.push(postSentiments[i]);
    }
  });
  comments.forEach((c, i) => {
    if (c.subreddit) {
      subredditGroups[c.subreddit] = subredditGroups[c.subreddit] || { sentiments: [], count: 0 };
      subredditGroups[c.subreddit].sentiments.push(commentSentiments[i]);
    }
  });

  const perSubreddit = {};
  Object.entries(subredditGroups).forEach(([subreddit, { sentiments }]) => {
    const n = sentiments.length;
    let subAvg = n ? sentiments.reduce((a, b) => a + b, 0) / n : 0;
    if (n < 5) subAvg = (subAvg * n) / 5;
    perSubreddit[subreddit] = Math.round(((subAvg + 1) * 50));
  });

  return {
    score,
    label: getSentimentLabel(score, N),
    avgPosts,
    avgComments,
    perSubreddit,
    n: N,
  };
}


async function fetchSubredditRecentStats(subreddit, token = null) {
  const baseUrl = token
    ? `https://oauth.reddit.com/r/${subreddit}`
    : `https://www.reddit.com/r/${subreddit}`;

  const headers = token
    ? {
      'User-Agent': 'SocialSentrixBot/1.0 (by u/SocialSentrix)',
      Authorization: `Bearer ${token}`
    }
    : { 'User-Agent': 'SocialSentrixBot/1.0 (by u/SocialSentrix)' };

  const fetchPosts = async (type) => {
    const url = `${baseUrl}/${type}.json?limit=100`;
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429) {
        console.log('Rate limit exceeded, waiting 90 seconds...');
        await new Promise(resolve => setTimeout(resolve, 90000));
        return fetchPosts(type);
      }
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.children?.map(c => c.data) || [];
    } catch {
      return [];
    }
  };

  const newPosts = await fetchPosts('new');
  const hotPosts = await fetchPosts('hot');
  const combined = [...newPosts, ...hotPosts];

  const upvotes = combined.map(p => p.ups || 0).filter(v => typeof v === 'number' && !isNaN(v));
  const comments = combined.map(p => p.num_comments || 0).filter(v => typeof v === 'number' && !isNaN(v));

  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const median = (arr) => {
    if (!arr.length) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  return {
    avgUpvotes: avg(upvotes),
    avgComments: avg(comments),
    medianUpvotes: median(upvotes),
    medianComments: median(comments),
    expectedUpvotes: median(upvotes),
    expectedComments: median(comments)
  };
}

async function calculateEngagement(posts, comments, ownedToken) {
  const allItems = [...(posts || []), ...(comments || [])];
  if (!allItems.length) return 50;

  const subredditStatsCache = {};
  const allSubreddits = allItems.map(i => i.subreddit).filter(Boolean);
  const uniqueSubs = [...new Set(allSubreddits)];

  for (let i = 0; i < uniqueSubs.length; i += BATCH_SIZE) {
    const batch = uniqueSubs.slice(i, i + BATCH_SIZE);
    try {
      const results = await Promise.all(
        batch.map(async subreddit => {
          const stats = await fetchSubredditRecentStats(subreddit, ownedToken);
          return { subreddit, stats };
        })
      );
      for (const { subreddit, stats } of results) {
        subredditStatsCache[subreddit] = stats;
      }
    } catch { }
  }

  const now = Date.now();
  const timeWeight = isoDate => {
    const t = new Date(isoDate);
    if (isNaN(t)) return 0;
    const days = (now - t.getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-days / 90);
  };

  const contentMap = {};
  let deletedCount = 0;
  const ratios = [];

  for (const post of posts) {
    const contentKey = ((post.title || '') + (post.text || '')).trim().toLowerCase();
    if (contentKey) contentMap[contentKey] = (contentMap[contentKey] || 0) + 1;

    if (post.text === '[removed]' || post.text === '[deleted]') {
      deletedCount++;
      continue;
    }

    const stats = subredditStatsCache[post.subreddit] || DEFAULT_STATS;
    const upvotes = Number(post.upvotes || 0);
    const commentCount = Number(post.comments || 0);
    const engagement = upvotes + commentCount;
    const expected = (stats.expectedUpvotes || 1) + (stats.expectedComments || 1);
    const weight = timeWeight(post.createdAt);

    if (weight <= 0 || !isFinite(engagement / expected)) continue;

    const ratio = (engagement / expected) * weight * 0.7;
    if (!isNaN(ratio)) ratios.push({ value: ratio, source: 'post' });
  }

  for (const comment of comments) {
    if (!comment.text || comment.text === '[removed]' || comment.text === '[deleted]') {
      deletedCount++;
      continue;
    }

    const stats = subredditStatsCache[comment.subreddit] || DEFAULT_STATS;
    const upvotes = Number(comment.upvotes || 0);
    const expected = stats.expectedUpvotes || 1;
    const weight = timeWeight(comment.createdAt);

    if (weight <= 0 || !isFinite(upvotes / expected)) continue;

    let ratio = (upvotes / expected) * weight;
    if (comment.text.length > 200) ratio *= 1.05;
    if (!isNaN(ratio)) ratios.push({ value: ratio, source: 'comment' });
  }

  const postRatios = ratios.filter(r => r.source === 'post').map(r => r.value);
  const commentRatios = ratios.filter(r => r.source === 'comment').map(r => r.value);
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  let avgRatio;
  if (postRatios.length && commentRatios.length) {
    avgRatio = 0.7 * avg(postRatios) + 0.3 * avg(commentRatios);
  } else if (postRatios.length) {
    avgRatio = avg(postRatios);
  } else {
    avgRatio = avg(commentRatios);
  }

  const safeRatio = Math.max(avgRatio, 0.01);
  const sigmoid = x => 100 / (1 + Math.exp(-8 * (x - 0.05)));
  let engagementScore = Math.round(sigmoid(safeRatio));

  const uniqueContent = Object.keys(contentMap).length;
  const duplicateRate = posts.length ? 1 - uniqueContent / posts.length : 0;
  const duplicatePenalty = duplicateRate > 0.2 ? (1 - duplicateRate) : 1;

  const deletionPenalty = deletedCount / allItems.length;
  const deletionFactor = deletionPenalty > 0.3 ? (1 - deletionPenalty) : 1;

  const diversityScore = Math.min(posts.length, 1) + Math.min(comments.length, 1);
  const diversityBoost = diversityScore >= 2 ? 1.05 : 1;

  engagementScore *= duplicatePenalty;
  engagementScore *= deletionFactor;
  engagementScore *= diversityBoost;

  const totalCount = posts.length + comments.length;
  const finalScore = totalCount < 5
    ? Math.round(engagementScore * (totalCount / 5) + 50 * (1 - totalCount / 5))
    : Math.round(engagementScore);

  const score = Math.min(100, Math.max(0, finalScore));
  return {
    score,
    perSubredditStats: subredditStatsCache,
    deletionStats: {
      deletedCount,
      totalCount,
      percentage: Math.round((deletedCount / (totalCount || 1)) * 100),
    },
    duplicationStats: {
      totalPosts: posts.length,
      uniquePosts: uniqueContent,
      duplicateRate: Math.round(duplicateRate * 100),
    },
    diversityScore: {
      posts: posts.length,
      comments: comments.length,
      value: diversityScore
    }
  };
}


function parseMemberCount(str) {
  if (typeof str === 'number') return str;
  if (typeof str !== 'string') return 0;
  str = str.trim().toUpperCase();
  if (str.endsWith('B')) return parseFloat(str) * 1_000_000_000;
  if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
  if (str.endsWith('K')) return parseFloat(str) * 1_000;
  return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

function calculateTrustworthiness(guest) {
  const badges = guest.badges || [];
  const trophies = guest.trophies || [];
  const has_verified_email = guest.about?.has_verified_email || false;
  const is_gold = guest.about?.is_gold || false;
  const cakeDay = guest.cakeDay || null;
  const moderatedSubs = guest.moderatedSubs || [];
  const totalKarma = guest.karma?.total || 0;
  let isAdmin = false;
  if (badges.includes('Reddit Admin')) isAdmin = true;

  let maxMembers = 0;
  for (const sub of moderatedSubs) {
    const count = parseMemberCount(sub.members);
    if (count > maxMembers) maxMembers = count;
  }

  const modBonuses = [
    { min: 1_000_000, bonus: 35 },
    { min: 100_000, bonus: 15 },
    { min: 1_000, bonus: 5 },
    { min: 0, bonus: 0 }
  ];
  const modBonus = modBonuses.find(t => maxMembers >= t.min).bonus;

  const ageBonuses = [
    { min: 15, bonus: 35 },
    { min: 10, bonus: 28 },
    { min: 7, bonus: 22 },
    { min: 5, bonus: 17 },
    { min: 3, bonus: 12 },
    { min: 2, bonus: 8 },
    { min: 1, bonus: 4 }
  ];
  let ageBonus = 0;
  if (cakeDay) {
    const ageYears = (Date.now() - new Date(cakeDay)) / (1000 * 60 * 60 * 24 * 365);
    for (const { min, bonus } of ageBonuses) {
      if (ageYears >= min) {
        ageBonus = bonus;
        break;
      }
    }
  }

  const karmaBonuses = [
    { min: 1_000_000, bonus: 35 },
    { min: 100_000, bonus: 25 },
    { min: 10_000, bonus: 15 },
    { min: 1_000, bonus: 8 },
    { min: 100, bonus: 3 },
    { min: 0, bonus: 0 },
    { min: -Infinity, bonus: 0 }
  ];
  const karmaBonus = karmaBonuses.find(t => totalKarma >= t.min).bonus;

  let score = 0;
  if (isAdmin == true) {
    score = 100;
  }
  else {
    score += modBonus;
    score += has_verified_email ? 15 : 0;
    score += is_gold ? 10 : 0;
    score += badges.length > 0 ? 5 : 0;
    score += trophies.length > 0 ? 5 : 0;
    score += ageBonus;
    score += karmaBonus;

    score = Math.min(100, Math.max(0, Math.round(score)));
  }

  return {
    score,
    has_verified_email,
    is_gold,
    badges,
    trophies,
    ageYears: cakeDay ? ((Date.now() - new Date(cakeDay)) / (1000 * 60 * 60 * 24 * 365)) : null,
    moderatedSubs: moderatedSubs.map(sub => ({
      name: sub.name,
      members: sub.members
    }))
  };
}


function calculateInfluence(guest) {
  const postKarma = guest.karma?.post || 0;
  const commentKarma = guest.karma?.comment || 0;

  const POST_WEIGHT = 0.75;
  const COMMENT_WEIGHT = 0.25;
  const totalKarma = POST_WEIGHT * postKarma + COMMENT_WEIGHT * commentKarma;

  const karmaTiers = [
    { min: 1_000_000, bonus: 75 },
    { min: 100_000, bonus: 50 },
    { min: 10_000, bonus: 35 },
    { min: 1_000, bonus: 25 },
    { min: 100, bonus: 10 },
    { min: 0, bonus: 5 }
  ];

  const karmaInfluence = totalKarma < 0
    ? 0
    : karmaTiers.sort((a, b) => b.min - a.min).find(t => totalKarma >= t.min).bonus;

  const moderatedSubs = guest.moderatedSubs || [];
  const totalMembers = moderatedSubs.reduce((sum, sub) => {
    let count = sub.members;
    if (typeof count === 'string') {
      const s = count.toUpperCase().trim();
      if (s.endsWith('B')) count = parseFloat(s) * 1_000_000_000;
      else if (s.endsWith('M')) count = parseFloat(s) * 1_000_000;
      else if (s.endsWith('K')) count = parseFloat(s) * 1_000;
      else count = parseInt(s.replace(/[^\d]/g, '')) || 0;
    }
    if (typeof count !== 'number' || isNaN(count)) count = 0;
    return sum + count;
  }, 0);

  const subsInfluence = Math.min(20, Math.round(Math.log10(totalMembers + 1) * 5));
  const totalInfluence = Math.min(100, Math.round(karmaInfluence + subsInfluence));
  const score = Math.max(0, totalInfluence);
  return {
    score,
    postKarma,
    commentKarma,
    totalMembers
  };
}


function calculateConsistency(posts, comments) {
  const dates = [...posts, ...comments].map(item => new Date(item.createdAt)).filter(d => !isNaN(d));
  if (!dates.length) return 50;

  const sorted = dates.sort((a, b) => a - b);
  const weekBuckets = {};

  for (const date of sorted) {
    const year = date.getUTCFullYear();
    const week = Math.floor((date - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24 * 7));
    const key = `${year}-W${week}`;
    weekBuckets[key] = (weekBuckets[key] || 0) + 1;
  }

  const weeklyCounts = Object.values(weekBuckets);
  const mean = weeklyCounts.reduce((a, b) => a + b, 0) / weeklyCounts.length;
  const stdDev = Math.sqrt(weeklyCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / weeklyCounts.length);
  const cv = stdDev / (mean || 1);

  const totalWeeks = Math.max(1, Math.ceil((sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24 * 7)));
  const inactiveWeeks = totalWeeks - weeklyCounts.length;

  let score = 100;

  if (cv > 1) score -= Math.min(30, Math.round((cv - 1) * 25));
  if (inactiveWeeks > 0) score -= Math.min(30, Math.round((inactiveWeeks / totalWeeks) * 100));
  if (mean >= 1 && mean <= 5) score += 5;

  const now = new Date();
  const lastActivity = sorted[sorted.length - 1];
  const monthsSinceLast = (now - lastActivity) / (1000 * 60 * 60 * 24 * 30.44);

  if (monthsSinceLast >= 12) score -= 20;
  else if (monthsSinceLast >= 6) score -= 10;
  else if (monthsSinceLast >= 3) score -= 5;

  const activitySpan = {
    start: sorted[0],
    end: sorted[sorted.length - 1]
  };

  const lastActive = sorted[sorted.length - 1];

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    activitySpan: {
      start: activitySpan.start.toISOString(),
      end: activitySpan.end.toISOString()
    },
    totalWeeks,
    activeWeeks: Object.keys(weekBuckets).length,
    inactiveWeeks,
    cv,
    lastActive: lastActive.toISOString()
  };
}



exports.getRedditSETIC = async (req, res) => {
  const { username, start, end, dryRun, userID: userIDFromBody } = req.query;
 const userID = req.cookies.userID || userIDFromBody;

  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const db = getDb();
    const profile = await db.collection(dbProfiles).findOne({ platform: 'reddit', username: username.toLowerCase() });
    if (!profile?.guestView) return res.status(404).json({ error: 'Profile not found. Please submit it first.' });

    const guest = profile.guestView;
    let ownedToken = null;
    let isAuthenticated = false;
    let tokenWarning = null;

    if (userID) {
      const account = await db.collection(dbAccounts).findOne({ id: userID });
      const owned = account?.ownedProfiles?.find(p => p.platform === 'reddit' && p.user === username.toLowerCase());
      if (owned?.reddit_token) {
        ownedToken = owned.reddit_token;
        isAuthenticated = true;
      } else if (owned) {
        tokenWarning = 'You own this profile but no Reddit token was found.';
      }
    }

    let uniqueSubs = [];
    if (guest.posts && guest.posts.length > 0) {
      uniqueSubs = [...new Set(guest.posts.map(p => p.subreddit).filter(Boolean))];
    }

    const estimatedBatches = Math.ceil(uniqueSubs.length / BATCH_SIZE);
    const rateLimit = isAuthenticated ? RATE_LIMITS.authenticated : RATE_LIMITS.unauthenticated;
    const fullPauses = Math.floor(uniqueSubs.length / rateLimit);
    const optimisticETA = estimatedBatches;
    const pessimisticETA = (fullPauses * 90) + (uniqueSubs.length % rateLimit);

    if (dryRun === 'true') {
      return res.json({
        status: userID ? (ownedToken ? 'loggedInWithToken' : 'loggedInNoToken') : 'notLoggedIn',
        etaSeconds: optimisticETA,
        etaMaxSeconds: pessimisticETA,
        tokenWarning,
        proceedable: true
      });
    }

    const seticScores = await calculateSETIC({
      guest,
      ownedToken,
      startDate: start,
      endDate: end
    });

    res.json({ ...seticScores, warning: tokenWarning });
  } catch (err) {
    console.error('SETIC error:', err);
    res.status(500).json({ error: 'Failed to calculate SETIC' });
  }
};
