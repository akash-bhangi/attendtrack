/**
 * Migration Script: Local MongoDB → MongoDB Atlas
 * Uses mongoose's underlying mongodb driver to copy all collections.
 */

const dns = require('dns');
const mongoose = require('mongoose');

// Ensure SRV records can be resolved even if local router/ISP DNS fails to resolve SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}

require('dotenv').config();

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/attendtrack';
const ATLAS_URI = process.env.MONGODB_URI;

async function migrate() {
  let localConn, atlasConn;

  try {
    console.log('[1/4] Connecting to local MongoDB...');
    localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('  done - Local connection established');

    console.log('[2/4] Connecting to MongoDB Atlas...');
    atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('  done - Atlas connection established');

    const localDb = localConn.db;
    const atlasDb = atlasConn.db;

    // Get all collections from local DB
    const collections = await localDb.listCollections().toArray();
    console.log('\n[3/4] Found ' + collections.length + ' collections to migrate:\n');

    let totalDocs = 0;

    for (const colInfo of collections) {
      const colName = colInfo.name;
      const localCol = localDb.collection(colName);
      const atlasCol = atlasDb.collection(colName);

      // Read all documents from local
      const docs = await localCol.find({}).toArray();

      if (docs.length === 0) {
        console.log('  skip  ' + colName + ': 0 documents (skipped)');
        continue;
      }

      // Check if Atlas collection already has data
      const existingCount = await atlasCol.countDocuments();
      if (existingCount > 0) {
        console.log('  warn  ' + colName + ': Atlas already has ' + existingCount + ' docs - clearing before import...');
        await atlasCol.deleteMany({});
      }

      // Insert into Atlas
      const result = await atlasCol.insertMany(docs);
      console.log('  done  ' + colName + ': ' + result.insertedCount + ' documents migrated');
      totalDocs += result.insertedCount;
    }

    console.log('\n[4/4] Migration complete! ' + totalDocs + ' total documents migrated to Atlas.\n');

  } catch (err) {
    console.error('\nMigration failed:', err.message);
    if (err.message.includes('ECONNREFUSED') && err.message.includes('127.0.0.1')) {
      console.error('   Make sure your local MongoDB is running.');
    }
    if (err.message.includes('authentication') || err.message.includes('auth')) {
      console.error('   Check your Atlas username/password.');
    }
    process.exit(1);
  } finally {
    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
  }
}

migrate();
