const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// Get notification counts for the user
router.get('/counts', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get all unread messages where user is NOT sender
    const unreadMessages = await Message.find({
      isRead: false,
      sender: { $ne: userId }
    }).select('connectionId');

    // 2. Calculate distinct chats (for Bottom Nav)
    const distinctChats = new Set(unreadMessages.map(m => m.connectionId.toString()));
    
    // 3. Calculate per-chat unread counts (for Messages List)
    const perChat = {};
    unreadMessages.forEach(msg => {
      const cid = msg.connectionId.toString();
      perChat[cid] = (perChat[cid] || 0) + 1;
    });

    // 4. Count connections
    const user = await User.findById(userId);
    const connectionsCount = user.connections ? user.connections.length : 0;

    res.json({
      messages: distinctChats.size, // Number of users messaging me
      perChat: perChat, // Counts per connection
      connections: connectionsCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
