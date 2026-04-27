const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Connection = require('../models/Connection');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

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

// Get global online users for the Home page indicators
router.get('/online', async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    
    // Find any users who are currently online, excluding the current user
    const query = { onlineStatus: true };
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    const onlineUsers = await User.find(query)
      .limit(6)
      .select('username profilePic fullName');
    
    res.json(onlineUsers);
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

module.exports = router;
