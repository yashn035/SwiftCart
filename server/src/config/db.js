const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // Check if URI is a placeholder
  const isPlaceholder =
    !uri ||
    uri.includes('YOUR_USERNAME') ||
    uri.includes('YOUR_PASSWORD');

  if (isPlaceholder) {
    return connectMemory();
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB Atlas connection failed:', err.message);
    console.log('');
    console.log('🔧 Most likely fix: Whitelist your IP in MongoDB Atlas:');
    console.log('   1. Go to https://cloud.mongodb.com');
    console.log('   2. Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)');
    console.log('');
    console.log('⚠️  Falling back to in-memory MongoDB for now...');
    await connectMemory();
  }
};

const connectMemory = async () => {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    global.__MONGOD__ = mongod;
    const conn = await mongoose.connect(uri);
    console.log(`✅ In-memory MongoDB running (data resets on restart)`);
    console.log(`   Host: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ Failed to start in-memory MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
