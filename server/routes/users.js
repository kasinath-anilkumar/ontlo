const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Connection = require('../models/Connection');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

const AppConfig = require('../models/AppConfig');

// Helper to get userId from token if exists
const getUserId = (req) => {
  const token = req.headers.authorization;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    return decoded.id;
  } catch (err) {
    return null;
  }
};

// Discover: Get potential matches based on Admin algorithm settings
router.get('/discover', async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const currentUser = await User.findById(currentUserId);
    
    // Fetch algorithm settings from Admin Panel config
    const config = await AppConfig.findOne({ key: 'matchmaking_settings' });
    const settings = config ? config.value : { radius: 50, ageGap: 5, boostPremium: true };

    const query = {
      _id: { $ne: currentUserId },
      role: 'user', // Hide admins/moderators from discovery
      status: 'active',
      isShadowBanned: false,
      onlineStatus: true
    };

    // Apply Age Filter from Admin settings
    if (currentUser.age) {
      query.age = { 
        $gte: currentUser.age - settings.ageGap, 
        $lte: currentUser.age + settings.ageGap 
      };
    }

    // Apply Location Filter (Mocking radius for now as we don't have GeoJSON indices yet)
    // In a real production app, we would use $near with settings.radius

    const matches = await User.find(query)
      .sort(settings.boostPremium ? { isPremium: -1, createdAt: -1 } : { createdAt: -1 })
      .limit(20)
      .select('username profilePic age gender bio isPremium');

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get online users who are also connections for the Home page
router.get('/online', async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) return res.json([]); // Guest sees no one in "Active Now"

    // 1. Find all connection documents for this user
    const connections = await Connection.find({ users: currentUserId });
    
    // 2. Extract the "other" user IDs
    const connectedUserIds = connections.map(conn => 
      conn.users.find(id => id.toString() !== currentUserId.toString())
    );

    // 3. Find which of those connected users are currently online and ARE NOT admins
    const onlineConnections = await User.find({
      _id: { $in: connectedUserIds },
      onlineStatus: true,
      role: 'user'
    })
    .limit(10)
    .select('username profilePic fullName');
    
    res.json(onlineConnections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username profilePic fullName age gender location interests bio isPremium onlineStatus');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const connectionsCount = await Connection.countDocuments({ users: user._id });
    
    const userObj = user.toObject();
    userObj.connectionsCount = connectionsCount;
    
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Block a user
router.post('/block', async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { blockedUserId } = req.body;
    if (!blockedUserId) return res.status(400).json({ error: 'Blocked user ID is required' });
    if (currentUserId === blockedUserId) return res.status(400).json({ error: 'Cannot block yourself' });

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (!currentUser.blockedUsers.includes(blockedUserId)) {
      currentUser.blockedUsers.push(blockedUserId);
      await currentUser.save();
    }

    // Also remove any existing connection between them
    await Connection.deleteOne({
      users: { $all: [currentUserId, blockedUserId] }
    });

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get blocked users list
router.get('/blocked/list', async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(currentUserId).populate('blockedUsers', 'username profilePic fullName');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.blockedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unblock a user
router.post('/unblock', async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { unblockUserId } = req.body;
    if (!unblockUserId) return res.status(400).json({ error: 'User ID to unblock is required' });

    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== unblockUserId);
    await user.save();

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user settings
router.patch('/settings', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { settings } = req.body;
    if (!settings) return res.status(400).json({ error: 'Settings object is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update settings object
    user.settings = { ...user.settings, ...settings };
    await user.save();

    res.json({ message: 'Settings updated successfully', settings: user.settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
