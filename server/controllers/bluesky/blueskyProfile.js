const { BskyAgent } = require('@atproto/api');
const { getDb, dbAccounts, dbProfiles } = require('../../services/mongo');

const agent = new BskyAgent({ service: 'https://bsky.social' });

function buildMeaningfulUpdate(basePath, data, updateDoc) {
  if (data == null) return;

  if (data instanceof Date) {
    updateDoc.$set[basePath] = data.toISOString();
    return;
  }

  if (Array.isArray(data)) {
    if (data.length > 0) {
      updateDoc.$set[basePath] = data;
    }
    return;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return;

    for (const key of keys) {
      const value = data[key];
      buildMeaningfulUpdate(`${basePath}.${key}`, value, updateDoc);
    }
    return;
  }

  updateDoc.$set[basePath] = data;
}

exports.getBlueskyProfile = async (req, res) => {
  try {
    const { username } = req.body;
    const userID = req.cookies.userID;

    if (!username) return res.status(400).json({ error: 'Invalid Bluesky username format' });

    const db = getDb();
    const accountsCol = db.collection(dbAccounts);
    const profilesCol = db.collection(dbProfiles);

    let ownerMode = false;
    let did = null;
    let accessJwt = null;
    let refreshJwt = null;
    const platform = 'bluesky';
    let tokenInvalid = false;

    if (userID) {
      const userAccount = await accountsCol.findOne({ id: userID });
      if (userAccount) {
        const isOwner = userAccount.ownedProfiles?.find(p => p.platform === platform && p.user === username);
        if (isOwner) {
          did = isOwner.did || null;
          accessJwt = isOwner.token || null;
          refreshJwt = isOwner.refresh || null;
          ownerMode = true;
        } else {
          const alreadyAssociated = userAccount.associatedProfiles?.some(p => p.platform === platform && p.user === username);
          if (!alreadyAssociated) {
            await accountsCol.updateOne(
              { id: userID },
              { $push: { associatedProfiles: { platform, user: username } } }
            );
          }
        }
      }
    }

    try {
      if (ownerMode) {
        try {
          await agent.resumeSession({ did, accessJwt, refreshJwt });
          tokenInvalid = false;
        } catch (err) {
          console.warn('⚠️ Failed to resume session:', err.message);
          tokenInvalid = true;
          ownerMode = false;
        }
      } else {
        await agent.login({
          identifier: 'socialsentrix@gmail.com',
          password: 'SocialF!!'
        });
      }
    } catch (err) {
      console.warn('⚠️ Failed to authenticate with Bluesky:', err);
    }

    const resolved = await agent.resolveHandle({ handle: username });
    const actor = resolved?.data?.did;
    if (!actor) {
      console.warn(`❌ Could not resolve DID for handle: ${username}`);
      return res.status(404).json({ error: 'Unable to resolve Bluesky handle' });
    }

    const getAllPages = async (fn, key, label) => {
      const all = [];
      let cursor, page = 1;
      while (true) {
        try {
          const res = await fn({ actor, cursor, limit: 100 });
          const items = res?.data?.[key] ?? [];
          if (items.length === 0) break;
          all.push(...items);
          cursor = res?.data?.cursor;
          if (!cursor) break;
        } catch (err) {
          console.warn(`⚠️ Error fetching ${label}:`, err);
          break;
        }
      }
      return all;
    };

    const rawFeed = await getAllPages(agent.getAuthorFeed.bind(agent), 'feed', 'Author Feed');
    //const rawFollows = await getAllPages(agent.getFollows.bind(agent), 'follows', 'Follows');
    //const rawFollowers = await getAllPages(agent.getFollowers.bind(agent), 'followers', 'Followers');

    const profileRes = await agent.getProfile({ actor });
    const followerCount = profileRes?.data?.followersCount ?? 0;
    const followingCount = profileRes?.data?.followsCount ?? 0;


    let rawLikes = [];
    if (ownerMode && agent.session?.did) {
      rawLikes = await getAllPages(agent.getActorLikes.bind(agent), 'feed', 'Likes');
    }

    const posts = rawFeed.filter(p =>
      p.post?.record?.$type === 'app.bsky.feed.post' && !p.reply && !p.reason
    );
    const comments = rawFeed.filter(p =>
      p.post?.record?.$type === 'app.bsky.feed.post' && p.reply
    );
    const reposts = rawFeed.filter(p =>
      p.reason?.$type === 'app.bsky.feed.defs#reasonRepost'
    );

    console.log('🚀 Final output counts:', {
      posts: posts.length,
      comments: comments.length,
      reposts: reposts.length,
      likes: rawLikes.length,
      follows: followingCount,
      followers: followerCount
    });

    const parseFeed = items => items.map(p => ({
      text: p.post?.record?.text || '',
      uri: p.post?.uri,
      cid: p.post?.cid,
      authorHandle: p.post?.author?.handle,
      createdAt: p.post?.record?.createdAt,
      likeCount: p.post?.likeCount,
      repostCount: p.post?.repostCount,
      replyCount: p.post?.replyCount
    }));

    const parsedPosts = parseFeed(posts);
    const parsedComments = parseFeed(comments);
    const parsedReposts = parseFeed(reposts);
    const parsedLikes = parseFeed(rawLikes);

    const guestView = {
      followerCount,
      followingCount,
      posts: parsedPosts,
      comments: parsedComments,
      reposts: parsedReposts
    };

    const ownerView = ownerMode ? { likes: parsedLikes } : undefined;

    const updateDoc = { $set: { platform, username } };
    if (guestView) buildMeaningfulUpdate('guestView', guestView, updateDoc);
    if (ownerMode && ownerView) buildMeaningfulUpdate('ownerView', ownerView, updateDoc);

    await profilesCol.updateOne(
      { platform, username },
      updateDoc,
      { upsert: true }
    );

    const savedProfile = await profilesCol.findOne(
      { platform, username },
      { projection: { _id: 0, guestView: 1, ownerView: 1 } }
    );

    if (!savedProfile || !savedProfile.guestView) {
      return res.status(500).json({ error: 'Profile save or retrieval failed.' });
    }

    return res.json({
      platform,
      username,
      tokenInvalid,
      posts: savedProfile.guestView.posts || [],
      comments: savedProfile.guestView.comments || [],
      reposts: savedProfile.guestView.reposts || [],
      ...(ownerMode && savedProfile.ownerView && {
        likes: savedProfile.ownerView.likes || []
      })
    });
  } catch (err) {
    console.error('❌ Uncaught error in getBlueskyProfile:', err);
    return res.status(500).json({ error: 'Failed to retrieve Bluesky profile data' });
  }
};


/*

const noAuthMethods = [
  'getAuthorFeed',
  'getTimeline',
  'getPostThread',
  'getPost',
  'getPosts',

  'getFollows',
  'getFollowers',

  'getProfiles',
  'getSuggestions',
  'searchActors',
  'searchActorsTypeahead',

  'resolveHandle'
];

const requiresAuthMethods = [
  'post',
  'deletePost',
  'like',
  'deleteLike',
  'repost',
  'deleteRepost',
  'uploadBlob',

  'follow',
  'deleteFollow',
  'mute',
  'unmute',
  'muteModList',
  'unmuteModList',
  'blockModList',
  'unblockModList',

  'listNotifications',
  'countUnreadNotifications',
  'updateSeenNotifications',

  'getProfile',
  'upsertProfile',
  'updateHandle'
];
*/