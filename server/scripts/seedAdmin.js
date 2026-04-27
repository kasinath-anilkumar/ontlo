const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ontlo');
    
    // Check if admin already exists
    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      console.log('⚠️ Admin user already exists. Use the existing one or delete it first.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'superadmin',
      status: 'active',
      isVerified: true,
      isProfileComplete: true,
      profilePic: 'https://cdn-icons-png.flaticon.com/512/219/219983.png'
    });

    await admin.save();
    console.log('✅ Admin User Created Successfully!');
    console.log('-------------------------------');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('-------------------------------');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

seed();
