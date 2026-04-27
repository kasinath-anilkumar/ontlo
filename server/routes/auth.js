const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware for auth
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        profilePic: newUser.profilePic,
        isProfileComplete: newUser.isProfileComplete
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        profilePic: user.profilePic,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete Profile
router.post('/complete-profile', authenticate, async (req, res) => {
  try {
    const { fullName, age, dob, gender, location, interests, bio, profilePic } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.fullName = fullName;
    user.age = age;
    user.dob = dob;
    user.gender = gender;
    user.location = location;
    user.interests = interests;
    user.bio = bio;
    if (profilePic) user.profilePic = profilePic;
    user.isProfileComplete = true;

    await user.save();

    res.json({
      message: 'Profile completed!',
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        profilePic: user.profilePic,
        age: user.age,
        gender: user.gender,
        location: user.location,
        interests: user.interests,
        bio: user.bio,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
