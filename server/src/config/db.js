const dns = require('dns');
const mongoose = require('mongoose');

// Ensure SRV records can be resolved reliably for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/attendtrack';

  if (primaryUri) {
    try {
      await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 4000
      });
      console.log('[MongoDB] Connected to primary MongoDB cluster successfully');
      return;
    } catch (error) {
      console.warn(`[MongoDB Primary] Connection failed (${error.message}). Attempting fallback to local MongoDB...`);
    }
  }

  try {
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log('[MongoDB] Connected to local MongoDB fallback successfully');
  } catch (localErr) {
    console.error(`[MongoDB] Local connection also failed: ${localErr.message}`);
  }
};

module.exports = connectDB;
