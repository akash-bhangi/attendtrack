const dns = require('dns');
const mongoose = require('mongoose');

// Ensure SRV records can be resolved reliably for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attendtrack');
    console.log('[MongoDB] Connected successfully');
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // Fallback or warning instead of crashing, allowing app to run even if local mongo is starting
  }
};

module.exports = connectDB;
