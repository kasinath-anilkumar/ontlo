const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Count mutual connections
    const connectionCount = await Connection.countDocuments({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    });

    // Count unread messages (sender != user)
    const unreadMessagesCount = await Message.countDocuments({
      isRead: false,
      sender: { $ne: userId }
    });

    res.json({
      connections: connectionCount,
      messages: unreadMessagesCount,
      likes: 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
