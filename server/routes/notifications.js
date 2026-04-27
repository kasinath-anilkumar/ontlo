const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get all notifications for the user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('fromUser', 'username profilePic')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.post('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );

    if (req.io) {
      req.io.emit('notification-update');
    }

    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notification counts for the user
router.get('/counts', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Unread messages
    const unreadMessages = await Message.find({
      isRead: false,
      sender: { $ne: userId }
    }).select('connectionId');

    const distinctChats = new Set(unreadMessages.map(m => m.connectionId.toString()));
    
    // 2. Unread general notifications
    const unreadNotifications = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    // 3. Count connections
    const user = await User.findById(userId);
    const connectionsCount = user.connections ? user.connections.length : 0;

    res.json({
      messages: distinctChats.size,
      notifications: unreadNotifications,
      connections: connectionsCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
