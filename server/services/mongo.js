const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB;

const client = new MongoClient(uri);
let db;

async function connectMongo() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log(`✅ Connected to MongoDB: ${dbName}`);
  }
  return db;
}

module.exports = connectMongo;