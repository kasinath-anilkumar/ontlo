const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/;

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ontlo');

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required to seed an admin user.');
    }

    if (!passwordRegex.test(adminPassword)) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol.');
    }

    const existing = await User.findOne({ username: adminUsername });
    if (existing) {
      console.log('Admin user already exists. Use the existing one or delete it first.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const admin = new User({
      username: adminUsername,
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'superadmin',
      status: 'active',
      isVerified: true,
      isProfileComplete: true,
      profilePic: 'https://cdn-icons-png.flaticon.com/512/219/219983.png'
    });

    await admin.save();
    console.log('Admin user created successfully.');
    console.log('-------------------------------');
    console.log(`Username: ${adminUsername}`);
    console.log('Password: set from ADMIN_PASSWORD');
    console.log('-------------------------------');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    mongoose.connection.close();
  }
};

seed();
