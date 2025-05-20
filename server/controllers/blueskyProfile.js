const { BskyAgent } = require('@atproto/api');
const { getDb, dbAccounts, dbProfiles } = require('../services/mongo');

const agent = new BskyAgent({ service: 'https://bsky.social' });

exports.getBlueskyProfile = async (req, res) => {
  const { username, appPassword } = req.body;
  const userID = req.cookies.userID;

  if (!username || !appPassword) {
    return res.status(400).json({ error: 'Missing Bluesky username or app password' });
  }

  const db = getDb();
  const accountsCol = db.collection(dbAccounts);
  const profilesCol = db.collection(dbProfiles);

  const platform = 'bluesky';
  let ownerConfirmed = false;

  try {
    await agent.login({ identifier: username, password: appPassword });

    if (userID) {
      const userAccount = await accountsCol.findOne({ id: userID });
      if (userAccount) {
        const alreadyOwned = userAccount.ownedProfiles?.some(p => p.platform === platform && p.user === username);
        if (!alreadyOwned) {
          await accountsCol.updateOne(
            { id: userID },
            { $push: { ownedProfiles: { platform, user: username } } }
          );
        }
        ownerConfirmed = true;
      }
    }

    const [blocks, mutes, feeds, notifications, follows] = await Promise.all([
      agent.app.bsky.graph.getBlocks(),
      agent.app.bsky.graph.getMutes(),
      agent.app.bsky.feed.getFeedGenerators(),
      agent.listNotifications(),
      agent.getFollows({ actor: username })
    ]);

    const ownerView = {
      mutedUsers: mutes.data.mutes.map(u => u.handle),
      blockedUsers: blocks.data.blocks.map(u => u.handle),
      feedGenerators: feeds.data.feeds.map(f => ({
        uri: f.uri,
        displayName: f.displayName
      })),
      notifications: notifications.data.notifications.map(n => ({
        reason: n.reason,
        author: n.author.handle,
        record: n.record?.text || '',
        indexedAt: n.indexedAt
      })),
      followingList: follows.data.follows.map(f => ({
        handle: f.handle,
        displayName: f.displayName
      }))
    };

    await profilesCol.updateOne(
      { platform, username },
      { $set: { ownerView } },
      { upsert: true }
    );

    const savedProfile = await profilesCol.findOne(
      { platform, username },
      { projection: { _id: 0, ownerView: 1 } }
    );

    return res.json({
      platform,
      username,
      ownerConfirmed,
      ownerView: savedProfile?.ownerView || {}
    });
  } catch (err) {
    console.error('Bluesky owner fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve Bluesky owner profile' });
  }
};
