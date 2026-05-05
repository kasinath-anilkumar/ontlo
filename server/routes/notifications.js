const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Diagnostic endpoint
router.get('/health/check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Test count - no auth needed, just counts notifications
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

// Get all notifications for the user (optimized with aggregation)
router.get('/', auth, async (req, res) => {
  const timer = { start: Date.now(), stages: {} };
  const mark = (stage) => {
    timer.stages[stage] = Date.now() - timer.start;
  };

  try {
    mark('auth-complete');

    // Count first to diagnose collection size
    const countStart = Date.now();
    const totalCount = await Notification.countDocuments({ user: req.userId });
    const countTime = Date.now() - countStart;
    if (countTime > 100) {
      console.log(`[NOTIFY] Count took ${countTime}ms for user ${req.userId?.slice?.(-4)} (total: ${totalCount})`);
    }
    mark('count-complete');

    // Simple find without any joins
    const findStart = Date.now();
    const notifications = await Notification.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()
      .exec();
    const findTime = Date.now() - findStart;
    if (findTime > 100) {
      console.log(`[NOTIFY] Find took ${findTime}ms, got ${notifications.length} documents`);
    }
    mark('find-complete');

    // Fetch user data separately (non-blocking after response)
    const userIds = [...new Set(notifications.map(n => n.fromUser).filter(Boolean))];
    
    let userMap = new Map();
    if (userIds.length > 0) {
      const User = require('../models/User');
      const usersStart = Date.now();
      const users = await User.find({ _id: { $in: userIds } })
        .select('_id username profilePic')
        .lean()
        .exec();
      userMap = new Map(users.map(u => [u._id.toString(), u]));
      const usersTime = Date.now() - usersStart;
      if (usersTime > 100) {
        console.log(`[NOTIFY] User fetch took ${usersTime}ms for ${users.length} users`);
      }
    }
    mark('users-complete');

    // Merge and respond
    const result = notifications.map(n => ({
      ...n,
      fromUser: n.fromUser ? userMap.get(n.fromUser.toString()) || null : null
    }));

    const totalTime = Date.now() - timer.start;
    console.log(`[NOTIFY] Total: ${totalTime}ms | Stages:`, Object.entries(timer.stages).map(([k, v]) => `${k}:${v}ms`).join(' | '));

    res.json(result);
  } catch (err) {
    const totalTime = Date.now() - timer.start;
    console.error(`[NOTIFY ERROR] after ${totalTime}ms:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const startTime = Date.now();
    
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isRead: true }
    );
    
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.log(`[SLOW] Notification read update took ${duration}ms`);
    }
    
    // Response immediately
    res.json({ message: 'Marked as read' });

    // Background update (Non-blocking)
    if (req.io) {
      (async () => {
        const { getUserCounts } = require('../utils/stats');
        const counts = await getUserCounts(req.userId, true); // Force refresh
        req.io.to(`user_${req.userId}`).emit('counts-update', counts);
      })().catch(e => console.error("BG Count Error:", e));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.post('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.userId, isRead: false },
      { isRead: true }
    );

    // Response immediately
    res.json({ message: 'All marked as read' });

    // Background update (Non-blocking)
    if (req.io) {
      (async () => {
        const { getUserCounts } = require('../utils/stats');
        const counts = await getUserCounts(req.userId);
        req.io.to(`user_${req.userId}`).emit('counts-update', counts);
      })().catch(e => console.error("BG Count Error:", e));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notification counts for the user
router.get('/counts', auth, async (req, res) => {
  try {
    const { getUserCounts } = require('../utils/stats');
    const counts = await getUserCounts(req.userId);
    res.json(counts);
  } catch (err) {
    console.error('[Notification Counts Error]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
