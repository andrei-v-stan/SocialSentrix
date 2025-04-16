const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function extractRedditUsername(input) {
  const regex = /(?:u\/|reddit\.com\/user\/)([a-zA-Z0-9-_]+)/;
  const match = input.match(regex);
  return match ? match[1] : null;
}

async function safeFetch(url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Bad response from ${url}`);
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching ${url}:`, err.message);
    return { error: true };
  }
}

exports.getRedditProfile = async (req, res) => {
  const { input } = req.body;
  const token = req.cookies.reddit_token;
  const loggedInUser = req.cookies.reddit_user;

  const username = extractRedditUsername(input);
  if (!username) {
    return res.status(400).json({ error: 'Invalid Reddit username format' });
  }

  const isOwnProfile = token && loggedInUser && loggedInUser.toLowerCase() === username.toLowerCase();
  const publicBase = `https://www.reddit.com/user/${username}`;
  const authBase = `https://oauth.reddit.com/user/${username}`;

  const headers = token
    ? { Authorization: `Bearer ${token}`, 'User-Agent': 'SocialSentrix/1.0' }
    : {};

  const [about, submitted, comments] = await Promise.all([
    safeFetch(`${publicBase}/about.json`),
    safeFetch(`${publicBase}/submitted.json`),
    safeFetch(`${publicBase}/comments.json`)
  ]);

  let upvoted = { error: true };
  let downvoted = { error: true };

  if (isOwnProfile) {
    [upvoted, downvoted] = await Promise.all([
      safeFetch(`${authBase}/upvoted`, headers),
      safeFetch(`${authBase}/downvoted`, headers)
    ]);
  }

  const parsePosts = (data) =>
    data?.data?.children?.map((post) => ({
      title: post.data.title,
      text: post.data.selftext,
      upvotes: post.data.ups,
      comments: post.data.num_comments
    })) || [];

  const parseComments = (data) =>
    data?.data?.children?.map((comment) => ({
      text: comment.data.body,
      upvotes: comment.data.ups
    })) || [];

  const isCompletelyInvalid =
    about?.error && submitted?.error && comments?.error;

  if (isCompletelyInvalid) {
    return res.status(404).json({ error: 'User not found or no public activity.' });
  }

  res.json({
    user: username,
    about: about?.data || {},
    posts: submitted.error ? null : parsePosts(submitted),
    comments: comments.error ? null : parseComments(comments),
    upvoted: upvoted.error ? null : parsePosts(upvoted),
    downvoted: downvoted.error ? null : parsePosts(downvoted),
    needsAuthForVotes: upvoted.error && downvoted.error && isOwnProfile,
    isOwnProfile
  });
};