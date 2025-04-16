const cron = require('node-cron');
const connectMongo = require('./mongo');

async function cleanupExpiredEntries() {
  try {
    const db = await connectMongo();
    const now = new Date();

    const loginResult = await db.collection(process.env.MONGO_COLLECTION_PENDING_REQUESTS).deleteMany({
      expiresAt: { $lt: now }
    });

    const pendingResult = await db.collection(process.env.MONGO_COLLECTION_PENDING_CONFIRMATIONS).deleteMany({
      createdAt: { $lt: new Date(now.getTime() - 60 * 60 * 1000) }
    });

    console.log(`🧹 Cleanup ran at ${now.toISOString()}`);
    console.log(`🗑️  Deleted ${loginResult.deletedCount} expired login requests.`);
    console.log(`🗑️  Deleted ${pendingResult.deletedCount} expired pending accounts.`);
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

async function removePending({ field, value, collectionPending }) {
  try {
    const db = await connectMongo();
    const collection = db.collection(collectionPending);
    const result = await collection.deleteMany({ [field]: value });
    console.log(`🗑️ Removed ${result.deletedCount} from ${collectionPending} where ${field} = ${value}`);
    return result.deletedCount;
  } catch (err) {
    console.error('❌ removePending error:', err);
    return null;
  }
}

async function removePending({ value, collectionPending }) {
  try {
    const db = await connectMongo();
    const collection = db.collection(collectionPending);

    let filter;
    if (collectionPending === process.env.MONGO_COLLECTION_PENDING_REQUESTS) {
      filter = { sessionID: value };
    } 
    else if (collectionPending === process.env.MONGO_COLLECTION_PENDING_CONFIRMATIONS) {
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