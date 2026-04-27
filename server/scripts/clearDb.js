const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Connection = require('../models/Connection');
const Message = require('../models/Message');

const clearDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    await User.deleteMany({});
    await Connection.deleteMany({});
    await Message.deleteMany({});

    console.log('Database cleared successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
};

clearDb();
