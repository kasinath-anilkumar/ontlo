const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

const MINIMUM_AGE = 13;
const MAXIMUM_AGE = 120;

const calculateAge = (dob, now = new Date()) => {
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

const validateAgeGate = ({ age, dob }) => {
  if (dob !== undefined) {
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return { error: 'Please enter a valid date of birth.' };
    }

    const ageFromDob = calculateAge(dob);
    if (ageFromDob < MINIMUM_AGE) {
      return { error: `You must be at least ${MINIMUM_AGE} years old to use Ontlo.` };
    }
    if (ageFromDob > MAXIMUM_AGE) {
      return { error: `Please enter a valid age between ${MINIMUM_AGE} and ${MAXIMUM_AGE}.` };
    }
    if (age !== undefined && Math.abs(age - ageFromDob) > 1) {
      return { error: 'Age does not match the provided date of birth.' };
    }

    return { age: ageFromDob, dob };
  }

  if (age !== undefined) {
    if (!Number.isFinite(age) || age < MINIMUM_AGE || age > MAXIMUM_AGE) {
      return { error: `Please enter a valid age between ${MINIMUM_AGE} and ${MAXIMUM_AGE}.` };
    }
    return { age };
  }

  return {};
};

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

    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    const age = req.body.age !== undefined && req.body.age !== null && req.body.age !== ''
      ? Number(req.body.age)
      : undefined;
    const dob = req.body.dob !== undefined && req.body.dob !== null && req.body.dob !== ''
      ? new Date(req.body.dob)
      : undefined;
    if (age === undefined && dob === undefined) {
      return res.status(400).json({ error: 'Date of birth is required to create an account.' });
    }

    const ageGate = validateAgeGate({ age, dob });
    if (ageGate.error) {
      return res.status(400).json({ error: ageGate.error });
    }

    const profileFields = {
      fullName: typeof req.body.fullName === 'string' ? req.body.fullName.trim() : undefined,
      age: ageGate.age,
      dob: ageGate.dob,
      gender: allowedGenders.includes(req.body.gender) ? req.body.gender : undefined,
      location: typeof req.body.location === 'string' ? req.body.location.trim() : undefined,
      interests: Array.isArray(req.body.interests)
        ? req.body.interests.map((interest) => String(interest).trim()).filter(Boolean)
        : [],
      bio: typeof req.body.bio === 'string' ? req.body.bio.trim() : undefined,
      profilePic: typeof req.body.profilePic === 'string' && req.body.profilePic ? req.body.profilePic : undefined
    };
    const hasRequiredProfile = Boolean(
      profileFields.fullName &&
      profileFields.age &&
      profileFields.gender &&
      profileFields.location &&
      profileFields.interests.length >= 3
    );

    const newUser = new User({
      username,
      password: hashedPassword,
      ...profileFields,
      isProfileComplete: hasRequiredProfile
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
    console.error('Registration Error:', error);
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
        fullName: user.fullName,
        profilePic: user.profilePic,
        age: user.age,
        dob: user.dob,
        gender: user.gender,
        location: user.location,
        interests: user.interests,
        bio: user.bio,
        settings: user.settings,
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
    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Type casting and validation to prevent DB validation errors (500)
    if (fullName !== undefined) user.fullName = String(fullName).trim();
    if (age !== undefined && age !== null && age !== '') {
      const numericAge = Number(age);
      const ageGate = validateAgeGate({ age: numericAge });
      if (ageGate.error) {
        return res.status(400).json({ error: ageGate.error });
      }
      user.age = ageGate.age;
    }
    if (dob !== undefined && dob !== null && dob !== '') {
      const parsedDob = new Date(dob);
      const ageGate = validateAgeGate({ age: user.age, dob: parsedDob });
      if (ageGate.error) {
        return res.status(400).json({ error: ageGate.error });
      }
      user.age = ageGate.age;
      user.dob = ageGate.dob;
    }
    if (gender !== undefined) {
      if (!allowedGenders.includes(gender)) {
        return res.status(400).json({ error: 'Please select a valid gender.' });
      }
      user.gender = gender;
    }
    if (location !== undefined) user.location = String(location).trim();
    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({ error: 'Interests must be a list.' });
      }
      user.interests = interests.map((interest) => String(interest).trim()).filter(Boolean);
    }
    if (bio !== undefined) user.bio = String(bio).trim();
    if (profilePic !== undefined && profilePic !== '') user.profilePic = String(profilePic);

    const hasRequiredProfile = Boolean(
      user.fullName &&
      user.age &&
      user.gender &&
      user.location &&
      user.interests.length >= 3
    );
    user.isProfileComplete = hasRequiredProfile;

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
        dob: user.dob,
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
