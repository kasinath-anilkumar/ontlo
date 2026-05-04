const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

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

    const connectionCount = await Connection.countDocuments({
      users: userId,
      status: 'active'
    });

    const connIds = await Connection.find({ users: userId, status: 'active' }).distinct('_id');
    const unreadMessagesCount =
      connIds.length === 0
        ? 0
        : await Message.countDocuments({
            connectionId: { $in: connIds },
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
