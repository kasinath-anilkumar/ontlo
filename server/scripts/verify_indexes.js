const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkIndexes() {
  try {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI not found in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const collections = ['messages', 'connections', 'users'];
    
    for (const colName of collections) {
      console.log(`\n--- Indexes for ${colName} ---`);
      const indexes = await mongoose.connection.db.collection(colName).getIndexes();
      console.log(JSON.stringify(indexes, null, 2));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkIndexes();
