const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixConnectionIndexes() {
  try {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI not found in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.db.collection('connections');
    
    console.log('Checking indexes for connections...');
    const indexes = await collection.getIndexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Find the conflicting index
    const usersIndex = indexes.users_1;
    if (usersIndex && usersIndex.unique) {
      console.log('Found offending unique index "users_1". Dropping it...');
      await collection.dropIndex('users_1');
      console.log('Successfully dropped unique index "users_1".');
    } else {
      console.log('No offending unique index "users_1" found.');
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixConnectionIndexes();
