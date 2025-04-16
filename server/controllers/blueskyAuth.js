const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function extractBlueskyHandle(input) {
  const match = input.match(/(?:^@|bsky\.app\/profile\/)([a-zA-Z0-9.-]+\.[a-z]{2,})/);
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

exports.getBlueskyProfile = async (req, res) => {
  const { input } = req.body;
  const token = req.cookies.bluesky_token;
  const loggedInUser = req.cookies.bluesky_user;
  const handle = extractBlueskyHandle(input);

  if (!handle) {
    return res.status(400).json({ error: 'Invalid Bluesky handle format' });
  }

  const baseURL = 'https://bsky.social/xrpc';
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [profile, posts, likes, reposts] = await Promise.all([
    safeFetch(`${baseURL}/app.bsky.actor.getProfile?actor=${handle}`, headers),
    safeFetch(`${baseURL}/app.bsky.feed.getAuthorFeed?actor=${handle}`, headers),
    safeFetch(`${baseURL}/app.bsky.feed.getLikes?actor=${handle}`, headers),
    safeFetch(`${baseURL}/app.bsky.feed.getRepostedBy?actor=${handle}`, headers)
  ]);

  const parsePosts = (data) =>
    data?.feed?.map((item) => ({
      text: item?.post?.record?.text,
      upvotes: item?.post?.likeCount,
      reposts: item?.post?.repostCount,
      comments: item?.post?.replyCount
    })) || [];

  const parseLikes = (data) =>
    data?.feed?.map((item) => ({
      title: item?.post?.record?.text,
      upvotes: item?.post?.likeCount
    })) || [];

  const parseReposts = (data) =>
    data?.repostedBy?.map((item) => ({
      text: item?.displayName,
      handle: item?.handle
    })) || [];

  const isCompletelyInvalid =
    profile?.error && posts?.error && likes?.error && reposts?.error;

  if (isCompletelyInvalid) {
    return res.status(404).json({ error: 'User not found or no public activity.' });
  }

  res.json({
    user: handle,
    about: profile?.displayName ? profile : null,
    posts: posts?.error ? null : parsePosts(posts),
    likes: likes?.error ? null : parseLikes(likes),
    reposts: reposts?.error ? null : parseReposts(reposts),
    needsAuthForExtras: likes?.error || reposts?.error,
    isOwnProfile: loggedInUser?.toLowerCase() === handle.toLowerCase()
  });
};
