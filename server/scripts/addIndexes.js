const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ontlo';

async function addIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    console.log('Adding compound index on { onlineStatus: 1, role: 1 }...');
    await collection.createIndex({ onlineStatus: 1, role: 1 }, {
      name: 'onlineStatus_1_role_1',
      background: true
    });

    console.log('Adding index on { interests: 1 }...');
    await collection.createIndex({ interests: 1 }, {
      name: 'interests_1',
      background: true
    });

    console.log('✅ Indexes added successfully!');
    console.log('Note: Background index creation may take some time to complete.');

  } catch (error) {
    console.error('❌ Error adding indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

addIndexes();