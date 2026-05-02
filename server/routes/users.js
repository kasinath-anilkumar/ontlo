const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Connection = require('../models/Connection');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { deleteImage } = require('../config/cloudinary');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  blockUserSchema,
  unblockUserSchema,
  settingsSchema,
  userIdParamSchema,
} = require('../validators/user.validator');
const { logActivity } = require('../utils/logger');

const AppConfig = require('../models/AppConfig');

// Discover: Get potential matches based on Admin algorithm settings
router.get('/discover', auth, async (req, res) => {
  try {
    const currentUserId = req.userId;

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
router.get('/online', auth.optional, async (req, res) => {
  try {
    const currentUserId = req.userId;
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

// Get blocked users list
router.get('/blocked/list', auth, async (req, res) => {
  try {
    const currentUserId = req.userId;

    const user = await User.findById(currentUserId).populate('blockedUsers', 'username profilePic fullName');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.blockedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user by ID
router.get('/:id', validate({ params: userIdParamSchema }), async (req, res) => {
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
router.post('/block', auth, validate({ body: blockUserSchema }), async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { blockedUserId } = req.body;

    if (currentUserId.toString() === blockedUserId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

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

    await logActivity({
      userId: currentUserId,
      action: 'user_block',
      req,
      metadata: { blockedUserId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unblock a user
router.post('/unblock', auth, validate({ body: unblockUserSchema }), async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { unblockUserId } = req.body;

    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== unblockUserId);
    await user.save();

    res.json({ message: 'User unblocked successfully' });

    await logActivity({
      userId: currentUserId,
      action: 'user_unblock',
      req,
      metadata: { unblockUserId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user settings
router.patch('/settings', auth, validate({ body: settingsSchema }), async (req, res) => {
  try {
    const userId = req.userId;
    const { settings } = req.body;

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

// Update matchmaking preferences
router.patch('/match-preferences', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { gender, ageRange, region } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (gender) user.matchPreferences.gender = gender;
    if (ageRange) {
      if (ageRange.min !== undefined) user.matchPreferences.ageRange.min = ageRange.min;
      if (ageRange.max !== undefined) user.matchPreferences.ageRange.max = ageRange.max;
    }
    if (region) user.matchPreferences.region = region;

    await user.save();

    res.json({ message: 'Match preferences updated successfully', matchPreferences: user.matchPreferences });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete account completely
router.delete('/account', auth, async (req, res) => {
  try {
    const currentUserId = req.userId;

    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Delete Profile Picture from Cloudinary
    if (user.profilePic) {
      await deleteImage(user.profilePic);
    }

    // 2. Find all connections
    const connections = await Connection.find({ users: currentUserId });
    const connectionIds = connections.map(c => c._id);

    // 3. Delete all messages in those connections (and any sent by user)
    await Message.deleteMany({
      $or: [
        { connectionId: { $in: connectionIds } },
        { sender: currentUserId }
      ]
    });

    // 4. Delete the connections
    await Connection.deleteMany({ users: currentUserId });

    // 5. Delete notifications
    await Notification.deleteMany({
      $or: [{ user: currentUserId }, { fromUser: currentUserId }]
    });

    // 6. Delete reports where user is reporter
    await Report.deleteMany({ reporter: currentUserId });

    // 7. Finally delete the user
    await User.findByIdAndDelete(currentUserId);

    res.json({ message: 'Account deleted successfully' });

    await logActivity({
      userId: currentUserId,
      action: 'account_deletion',
      req
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export user data as JSON
router.get('/export', auth, async (req, res) => {
  try {
    const currentUserId = req.userId;

    const user = await User.findById(currentUserId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const connections = await Connection.find({ users: currentUserId }).lean();
    const connectionIds = connections.map(c => c._id);

    const messages = await Message.find({
      $or: [
        { connectionId: { $in: connectionIds } },
        { sender: currentUserId }
      ]
    }).lean();

    const notifications = await Notification.find({ user: currentUserId }).lean();

    const exportData = {
      profile: user,
      connections: connections,
      messages: messages,
      notifications: notifications,
      exportedAt: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ontlo_data_export_${currentUserId}.json`);
    res.json(exportData);

    await logActivity({
      userId: currentUserId,
      action: 'export_data',
      req
    });
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
