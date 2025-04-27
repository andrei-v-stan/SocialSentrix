const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB;

const client = new MongoClient(uri);
let db = null;

async function connectMongo() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log(`✅ Connected to MongoDB: ${dbName}`);
  }
  return db;
}

const getDb = () => {
  if (!db) {
    throw new Error('❌ DB not initialized — call connectMongo() first!');
  }
  return db;
};

const dbAccounts = process.env.MONGO_COLLECTION_ACCOUNTS;
const dbProfiles = process.env.MONGO_COLLECTION_PROFILES;
const dbPendingConfirmations = process.env.MONGO_COLLECTION_PENDING_CONFIRMATIONS;
const dbPendingRequests = process.env.MONGO_COLLECTION_PENDING_REQUESTS;

module.exports = {
  connectMongo,
  getDb,
  getClient: () => client,
  dbAccounts,
  dbProfiles,
  dbPendingConfirmations,
  dbPendingRequests,
};
