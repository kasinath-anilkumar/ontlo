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
    
    // Response immediately
    res.json({ message: 'Marked as read' });

    // Background update (Non-blocking)
    if (req.io) {
      (async () => {
        const { getUserCounts } = require('../utils/stats');
        const counts = await getUserCounts(req.user.id);
        req.io.to(`user_${req.user.id}`).emit('counts-update', counts);
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
      { user: req.user.id, isRead: false },
      { isRead: true }
    );

    // Response immediately
    res.json({ message: 'All marked as read' });

    // Background update (Non-blocking)
    if (req.io) {
      (async () => {
        const { getUserCounts } = require('../utils/stats');
        const counts = await getUserCounts(req.user.id);
        req.io.to(`user_${req.user.id}`).emit('counts-update', counts);
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
    const counts = await getUserCounts(req.user.id);
    res.json(counts);
  } catch (err) {
    console.error('[Notification Counts Error]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
