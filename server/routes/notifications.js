// routes/notification.routes.js

const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

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
      .populate('fromUser._id', 'username profilePic') // Fallback for live data
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(`[NOTIFY] Fetch took ${duration}ms, count: ${notifications.length}`);
    }

    // Map to ensure frontend gets a flat object structure if populated
    const formatted = notifications.map(n => {
      if (n.fromUser && n.fromUser._id && typeof n.fromUser._id === 'object') {
        // Data was populated
        n.fromUser.username = n.fromUser._id.username || n.fromUser.username;
        n.fromUser.profilePic = n.fromUser._id.profilePic || n.fromUser.profilePic;
        n.fromUser._id = n.fromUser._id._id;
      }
      return n;
    });

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