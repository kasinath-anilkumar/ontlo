const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get all notifications for the user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.userId })
      .populate('fromUser', 'username profilePic')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isRead: true }
    );
    
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
