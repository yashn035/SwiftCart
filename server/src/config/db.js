const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const useLocal = process.env.USE_LOCAL_DB !== 'false';

  // Check if URI is a placeholder
  const isPlaceholder =
    !uri ||
    uri.includes('YOUR_USERNAME') ||
    uri.includes('YOUR_PASSWORD');

  if (useLocal || isPlaceholder) {
    return connectLocalFileDB();
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB Atlas connection failed:', err.message);
    console.log('');
    console.log('⚠️  Falling back to local file-based MongoDB...');
    await connectLocalFileDB();
  }
};

const connectLocalFileDB = async () => {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = path.join(__dirname, '../../data/db');
    
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    console.log(`📡 Starting persistent local file database at: ${dbPath}`);
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbPath: dbPath,
        storageEngine: 'wiredTiger',
      },
    });
    const uri = mongod.getUri();
    global.__MONGOD__ = mongod;
    const conn = await mongoose.connect(uri);
    console.log(`✅ Persistent local database connected (data saved in server/data/db)`);
    console.log(`   URI: ${uri}`);
  } catch (err) {
    console.error('❌ Failed to start persistent local MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

