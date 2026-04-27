const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const username = process.argv[2];

if (!username) {
  console.log('❌ Please provide a username: node makeAdmin.js <username>');
  process.exit(1);
}

const promote = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ontlo');
    
    const user = await User.findOneAndUpdate(
      { username },
      { role: 'superadmin', isVerified: true },
      { new: true }
    );

    if (!user) {
      console.log(`❌ User "${username}" not found.`);
    } else {
      console.log(`✅ Success! "${username}" is now a Super Admin.`);
      console.log(`🚀 You can now access all features in the Admin Panel.`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

promote();
