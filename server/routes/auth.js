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
    let { username, password } = req.body;

    // SECURITY: Prevent NoSQL Injection
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    // SECURITY: Strong Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(String(password))) {
      return res.status(400).json({ 
        error: 'Security Warning: Password must be 8+ chars with 1 Uppercase, 1 Number, and 1 Symbol.' 
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ 
      username, 
      password: hashedPassword,
      fullName: req.body.fullName || "",
      age: req.body.age || null,
      gender: req.body.gender || "",
      interests: req.body.interests || [],
      isProfileComplete: !!req.body.fullName
    });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        profilePic: newUser.profilePic,
        age: newUser.age,
        gender: newUser.gender,
        interests: newUser.interests,
        bio: newUser.bio,
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
    let { username, password } = req.body;
    
    // SECURITY: Prevent NoSQL Injection
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input format' });
    }
    
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    console.log(`Login attempt for ${username}. Role: ${user.role}. Admin Panel Flag: ${req.body.isAdminPanel}`);

    // SECURITY FIX: Prevent Admins from logging into the Social Client App
    // But ALLOW them if they are logging into the Admin Panel
    if ((user.role === 'admin' || user.role === 'superadmin') && !req.body.isAdminPanel) {
      return res.status(403).json({ error: 'Administrative accounts must use the Admin Panel.' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role, // Added role for RBAC
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

    // Type casting to prevent DB validation errors (500)
    if (fullName !== undefined) user.fullName = String(fullName);
    if (age !== undefined) user.age = Number(age);
    if (gender !== undefined) user.gender = String(gender);
    if (location !== undefined) user.location = String(location);
    if (interests !== undefined) user.interests = Array.isArray(interests) ? interests : [];
    if (bio !== undefined) user.bio = String(bio);
    if (profilePic !== undefined) user.profilePic = String(profilePic);
    
    user.isProfileComplete = true;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
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
    console.error('Profile Update Error:', error);
    res.status(400).json({ 
      error: 'Failed to update profile', 
      details: error.message 
    });
  }
});

module.exports = router;
