const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ensureAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ontlo');
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required to ensure an admin user.');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/;
    if (!passwordRegex.test(adminPassword)) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    const admin = await User.findOneAndUpdate(
      { username: adminUsername },
      {
        $set: {
          password: hashedPassword,
          role: 'superadmin',
          status: 'active',
          isVerified: true,
          isProfileComplete: true,
          fullName: 'System Administrator',
          profilePic: 'https://cdn-icons-png.flaticon.com/512/219/219983.png'
        }
      },
      { upsert: true, new: true }
    );
    console.log('✅ Admin user ensured:', admin.username);
  } catch (err) {
    console.error('❌ Failed to ensure admin:', err);
  } finally {
    mongoose.connection.close();
  }
};

ensureAdmin();
