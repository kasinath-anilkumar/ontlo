const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ontlo';

async function checkIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const collections = ['users', 'messages', 'connections', 'notifications'];
    
    for (const collName of collections) {
      console.log(`\nIndexes for collection: ${collName}`);
      const indexes = await mongoose.connection.db.collection(collName).indexes();
      console.log(JSON.stringify(indexes, null, 2));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkIndexes();
