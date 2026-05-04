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
    const mongoose = require('mongoose');

    // Run all count queries in parallel for maximum performance
    const [unreadChatResults, unreadNotifications, user] = await Promise.all([
      // 1. Count distinct connectionIds with unread messages where user is NOT the sender
      Message.aggregate([
        { 
          $match: { 
            isRead: false, 
            sender: { $ne: new mongoose.Types.ObjectId(userId) } 
          } 
        },
        { $group: { _id: "$connectionId" } },
        { $count: "count" }
      ]),
      
      // 2. Count unread general notifications
      Notification.countDocuments({
        user: userId,
        isRead: false
      }),

      // 3. Get user's connection array length (only select the connections field)
      User.findById(userId).select('connections')
    ]);

    const unreadChatCount = unreadChatResults.length > 0 ? unreadChatResults[0].count : 0;
    const connectionsCount = user?.connections ? user.connections.length : 0;

    res.json({
      messages: unreadChatCount,
      notifications: unreadNotifications,
      connections: connectionsCount
    });
  } catch (err) {
    console.error('[Notification Counts Error]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
