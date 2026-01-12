const cron = require('node-cron');
const { getDb, dbPendingConfirmations, dbPendingRequests } = require('./mongo');

async function cleanupExpiredEntries() {
  try {
    const db = getDb();
    const now = new Date();

    const loginResult = await db.collection(dbPendingRequests).deleteMany({
      status: { $ne: 'Confirmed' },
      expiresAt: { $lt: now }
    });    

    const pendingResult = await db.collection(dbPendingConfirmations).deleteMany({
      createdAt: { $lt: new Date(now.getTime() - 60 * 60 * 1000) }
    });


    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();

    console.log(`🧹 Cleanup ran at ${hours}:${minutes} ${ampm} ${day}/${month}/${year}`);

    console.log(`🗑️  Deleted ${loginResult.deletedCount} expired login requests`);
    console.log(`🗑️  Deleted ${pendingResult.deletedCount} expired pending accounts`);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

function startScheduledCleanup() {
  cleanupExpiredEntries();

  cron.schedule('0 0,6,12,18 * * *', () => {
    console.log('⏰ Scheduled cleanup triggered');
    cleanupExpiredEntries();
  });
}


async function removePending({ value, collectionPending }) {
  try {
    const db = await connectMongo();
    const collection = db.collection(collectionPending);

    let filter;
    if (collectionPending === dbPendingRequests) {
      filter = { sessionID: value };
    } 
    else if (collectionPending === dbPendingConfirmations) {
      filter = { userID: value };
    } 
    else {
      throw new Error(`Unknown collection: ${collectionPending}`);
    }

    const result = await collection.deleteMany(filter);
    console.log(`🗑️ Removed ${result.deletedCount} from ${collectionPending} matching value "${value}"`);
    return result.deletedCount;
  } catch (err) {
    console.error('❌ removePending error:', err);
    return null;
  }
}


module.exports = {
  cleanupExpiredEntries,
  startScheduledCleanup,
  removePending
};