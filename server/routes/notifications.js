// routes/notification.routes.js

const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');

// Health check
router.get('/health/check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Test count (optional debug)
router.get('/test/count', async (req, res) => {
  try {
    const start = Date.now();
    const count = await Notification.countDocuments({});
    const duration = Date.now() - start;

    console.log(`[TEST] Notification count: ${count}, took ${duration}ms`);

    res.json({ count, duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔥 GET notifications (ZERO JOIN VERSION)
router.get('/', auth, async (req, res) => {
  try {
    const start = Date.now();

    const notifications = await Notification.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // 1. Normalize all notifications (handle legacy string fromUser)
    notifications.forEach(n => {
      if (n.fromUser && (typeof n.fromUser === 'string' || mongoose.Types.ObjectId.isValid(n.fromUser))) {
        const id = n.fromUser;
        n.fromUser = { _id: id, username: 'User', profilePic: '' };
      }
    });

    // 2. Identify missing profile data
    const missingUserIds = notifications
      .filter(n => n.fromUser && n.fromUser._id && !n.fromUser.profilePic)
      .map(n => n.fromUser._id);

    let userMap = {};
    if (missingUserIds.length > 0) {
      const users = await User.find({ _id: { $in: missingUserIds } })
        .select('username profilePic')
        .lean();
      users.forEach(u => {
        userMap[u._id.toString()] = u;
      });
    }

    // 3. Merge data
    const formatted = notifications.map(n => {
      if (n.fromUser && n.fromUser._id) {
        const userIdStr = n.fromUser._id.toString();
        if (userMap[userIdStr]) {
          n.fromUser.username = userMap[userIdStr].username || n.fromUser.username;
          n.fromUser.profilePic = userMap[userIdStr].profilePic || n.fromUser.profilePic;
        }
      }
      return n;
    });

    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[NOTIFY SLOW] Fetch took ${duration}ms`);
    }

    res.json(formatted);

  } catch (err) {
    console.error('[NOTIFY ERROR]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// 🔥 Mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const start = Date.now();

    await Notification.updateOne(
      { _id: req.params.id, user: req.userId },
      { isRead: true }
    );

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(`[SLOW] Mark read took ${duration}ms`);
    }

    res.json({ message: 'Marked as read' });

    // OPTIONAL: emit without forcing DB recalculation
    if (req.io) {
      req.io.to(`user_${req.userId}`).emit('notification-read', {
        id: req.params.id
      });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔥 Mark all as read
router.post('/read-all', auth, async (req, res) => {
  try {
    const start = Date.now();

    await Notification.updateMany(
      { user: req.userId, isRead: false },
      { isRead: true }
    );

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(`[SLOW] Read all took ${duration}ms`);
    }

    res.json({ message: 'All marked as read' });

    if (req.io) {
      req.io.to(`user_${req.userId}`).emit('notifications-cleared');
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔥 SIMPLE COUNT (NO HEAVY STATS)
router.get('/counts', auth, async (req, res) => {
  try {
    const start = Date.now();

    const unreadCount = await Notification.countDocuments({
      user: req.userId,
      isRead: false
    });

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(`[COUNT] took ${duration}ms`);
    }

    res.json({ notifications: unreadCount });

  } catch (err) {
    console.error('[COUNT ERROR]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;