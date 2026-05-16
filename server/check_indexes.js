const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const checkIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const collInfo of collections) {
      const coll = db.collection(collInfo.name);
      const indexes = await coll.indexes();
      console.log(`\nIndexes for collection: ${collInfo.name}`);
      console.log(JSON.stringify(indexes, null, 2));
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkIndexes();
