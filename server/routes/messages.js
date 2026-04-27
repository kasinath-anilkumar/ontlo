const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware to protect routes
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get message history for a connection
router.get('/:connectionId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ connectionId: req.params.connectionId })
      .sort({ timestamp: 1 })
      .limit(100);
    
    // Format for frontend
    const formatted = messages.map(m => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender.toString() === req.user.id ? 'You' : 'Remote',
      timestamp: m.timestamp,
      type: m.sender.toString() === req.user.id ? 'self' : 'remote',
      isRead: m.isRead
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.post('/:connectionId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { connectionId: req.params.connectionId, sender: { $ne: req.user.id } },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
