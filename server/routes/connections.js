const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

// Middleware to mock authentication for now, or use JWT verification
// In a real app, you would have a middleware that sets req.userId from the JWT
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

const Message = require('../models/Message');

// Get user connections with last message
router.get('/', authenticate, async (req, res) => {
  try {
    const connections = await Connection.find({ users: req.userId })
      .populate('users', 'username profilePic onlineStatus age gender location bio fullName');
    
    // Format the response to return the *other* user in each connection + last message
    const formatted = await Promise.all(connections.map(async (c) => {
      const otherUser = c.users.find(u => u && u._id.toString() !== req.userId);
      const lastMsg = await Message.findOne({ connectionId: c._id }).sort({ createdAt: -1 });
      
      return {
        id: c._id,
        user: otherUser,
        status: c.status,
        createdAt: c.createdAt,
        lastMessage: lastMsg ? {
          text: lastMsg.text,
          createdAt: lastMsg.createdAt
        } : null
      };
    }));

    // Sort by last message activity or creation date
    formatted.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
      return dateB - dateA;
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a connection
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const connection = await Connection.findOne({ _id: req.params.id, users: req.userId });
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    
    await Connection.deleteOne({ _id: req.params.id });
    // Note: We keep the messages but they'll be inaccessible without the connection.
    // In a stricter app, you might delete messages here too.
    
    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get only online connections
router.get('/online', authenticate, async (req, res) => {
  try {
    const connections = await Connection.find({ users: req.userId })
      .populate('users', 'username profilePic onlineStatus age gender location bio fullName');
    
    const onlineOnes = connections
      .map(c => {
        const otherUser = c.users.find(u => u && u._id.toString() !== req.userId);
        return otherUser && otherUser.onlineStatus ? { id: c._id, user: otherUser } : null;
      })
      .filter(u => u);

    res.json(onlineOnes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
