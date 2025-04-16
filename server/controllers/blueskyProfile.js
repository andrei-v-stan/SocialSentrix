const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function extractBlueskyHandle(input) {
  const match = input.match(/(?:^@|bsky\.app\/profile\/)([a-zA-Z0-9.-]+\.[a-z]{2,})/);
  return match ? match[1] : null;
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Bad response from ${url}`);
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching ${url}:`, err.message);
    return { error: true };
  }
}

exports.getBlueskyProfile = async (req, res) => {

  const { input } = req.body;
  const handle = extractBlueskyHandle(input);

  if (!handle) {
    return res.status(400).json({ error: 'Invalid Bluesky handle format' });
  }

  const baseURL = 'https://public.api.bsky.app';
  const headers = { Accept: 'application/json' };


  const [profile, feed] = await Promise.all([
    safeFetch(`${baseURL}/xrpc/app.bsky.feed.getProfile?actor=${handle}`, { headers }),
    safeFetch(`${baseURL}/xrpc/app.bsky.actor.getPosts?actor=${handle}`, { headers }),
    safeFetch(`${baseURL}/xrpc/app.bsky.actor.getLikes?actor=${handle}`, { headers }),
    safeFetch(`${baseURL}/xrpc/app.bsky.actor.getRepostedBy?actor=${handle}`, { headers }),
    safeFetch(`${baseURL}/xrpc/app.bsky.actor.getFollowers?actor=${handle}`, { headers })
  ]);

  if (profile?.error && feed?.error) {
    return res.status(404).json({ error: 'User not found or no public activity.' });
  }

  const parsePosts = (feedData) =>
    feedData?.feed?.map((item) => ({
      text: item?.post?.record?.text,
      upvotes: item?.post?.likeCount,
      reposts: item?.post?.repostCount,
      comments: item?.post?.replyCount
    })) || [];

  res.json({
    user: handle,
    about: profile?.displayName ? profile : null,
    posts: feed?.error ? null : parsePosts(feed),
    comments: null, // To be derived from replies in a later version
    likes: null,    // Requires auth
    reposts: null,  // Requires auth
    needsAuthForExtras: true
  });
};
