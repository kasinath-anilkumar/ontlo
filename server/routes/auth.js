const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/jwt');
const validate = require('../middleware/validate');
const { 
  setupSchema, 
  registerSchema, 
  loginSchema, 
  completeProfileSchema 
} = require('../validators/auth.validator');
const { logActivity } = require('../utils/logger');

const generateTokens = async (user, res) => {
  const accessToken = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Save refresh token to user
  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push(refreshToken);
  await user.save();

  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  };

  console.log(`[Auth] Cookie Options (isProduction=${isProduction}):`, JSON.stringify(cookieOptions));
  
  res.cookie('token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 mins
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

  return accessToken;
};

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

const auth = require('../middleware/auth');

router.get('/setup/status', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'superadmin' });
    res.json({ isSetupComplete: adminCount > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Check username availability
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    
    const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    res.json({ available: !existingUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Secure Initial Setup Flow
router.post('/setup', validate({ body: setupSchema }), async (req, res) => {
  try {
    // SECURITY: Only allow setup if NO superadmin exists in the system
    const adminCount = await User.countDocuments({ role: 'superadmin' });
    if (adminCount > 0) {
      return res.status(403).json({ error: 'Setup already completed. A superadmin exists.' });
    }

    const { username, password, email } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const adminUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'superadmin',
      status: 'active',
      isVerified: true,
      isProfileComplete: true,
    });

    await adminUser.save();

    const token = await generateTokens(adminUser, res);

    res.status(201).json({
      message: 'System initialization complete.',
      token,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        role: adminUser.role,
        isProfileComplete: adminUser.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Setup Error:', error);
    res.status(500).json({ error: 'Server error during setup' });
  }
});

// Register
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  try {
    let { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Handle Profile Picture (if sent as base64 or raw)
    let profilePicUrl = req.body.profilePic || "";
    if (profilePicUrl && profilePicUrl.startsWith('data:image')) {
      try {
        const { uploadImage } = require('../config/cloudinary');
        // Create a mock file object for the existing uploadImage utility
        const result = await require('cloudinary').v2.uploader.upload(profilePicUrl, {
          folder: 'ontlo_profiles',
          transformation: [{ width: 500, height: 500, crop: 'limit' }]
        });
        profilePicUrl = result.secure_url;
      } catch (err) {
        console.error('Cloudinary upload failed during registration:', err);
      }
    }

    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    const age = req.body.age !== undefined && req.body.age !== null && req.body.age !== ''
      ? Number(req.body.age)
      : undefined;
    const dob = req.body.dob !== undefined && req.body.dob !== null && req.body.dob !== ''
      ? new Date(req.body.dob)
      : undefined;

    const profileFields = {
      fullName: req.body.fullName,
      age: req.body.age,
      dob: req.body.dob ? new Date(req.body.dob) : undefined,
      gender: req.body.gender,
      location: req.body.location,
      interests: req.body.interests || [],
      bio: req.body.bio,
      profilePic: profilePicUrl
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

    await logActivity({
      userId: newUser._id,
      action: 'registration',
      req,
      metadata: { username: newUser.username }
    });

    const token = await generateTokens(newUser, res);

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
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  try {
    let { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    // Check if account is locked
    if (user.isLocked) {
      await logActivity({
        userId: user._id,
        action: 'suspicious_activity',
        req,
        metadata: { detail: 'Login attempt on locked account' }
      });
      return res.status(403).json({ 
        error: 'Account is temporarily locked due to repeated failed login attempts. Please try again later.' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      const monitor = require('../utils/monitor');
      monitor.trackFailedLogin();
      await user.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on success
    if (user.loginAttempts !== 0 || user.lockUntil) {
      await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
    }

    console.log(`Login attempt for ${username}. Role: ${user.role}. Admin Panel Flag: ${req.body.isAdminPanel}`);

    // SECURITY FIX: Prevent Admins from logging into the Social Client App
    // But ALLOW them if they are logging into the Admin Panel
    if ((user.role === 'admin' || user.role === 'superadmin') && !req.body.isAdminPanel) {
      return res.status(403).json({ error: 'Administrative accounts must use the Admin Panel.' });
    }

    const token = await generateTokens(user, res);

    await logActivity({
      userId: user._id,
      action: 'login',
      req,
      metadata: { isAdminPanel: req.body.isAdminPanel }
    });

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

// Refresh Token
router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '15m' });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };
    
    res.cookie('token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });

    res.json({ token: accessToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { ignoreExpiration: true });
      await User.findByIdAndUpdate(decoded.id, { $pull: { refreshTokens: refreshToken } });
      
      await logActivity({
        userId: decoded.id,
        action: 'logout',
        req
      });
    } catch (err) {}
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0)
  };

  res.cookie('token', '', cookieOptions);
  res.cookie('refreshToken', '', { ...cookieOptions, path: '/api/auth' });
  
  res.json({ message: 'Logged out successfully' });
});

router.post('/complete-profile', auth, validate({ body: completeProfileSchema }), async (req, res) => {
  try {
    const { fullName, age, dob, gender, location, interests, bio, profilePic } = req.body;
    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Data is already validated by Zod, but we still apply to user object
    if (fullName !== undefined) user.fullName = String(fullName).trim();
    if (age !== undefined && age !== null && age !== '') {
      user.age = Number(age);
    }
    if (dob !== undefined && dob !== null && dob !== '') {
      user.dob = new Date(dob);
    }
    if (gender !== undefined) user.gender = gender;
    if (location !== undefined) user.location = String(location).trim();
    if (interests !== undefined) {
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

    await logActivity({
      userId: user._id,
      action: 'profile_update',
      req,
      metadata: { fields: Object.keys(req.body) }
    });

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
