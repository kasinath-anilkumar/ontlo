const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const validate = require('../middleware/validate');
const { connectionIdParamSchema } = require('../validators/connection.validator');

// Get user connections with last message
router.get('/', auth, async (req, res) => {
  try {
    const connections = await Connection.find({ 
      users: req.userId, 
      status: { $in: ['active', 'matched'] } 
    })
      .populate('users', 'username profilePic onlineStatus')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    
    // 2. Fetch last messages for all connections in ONE query using aggregation
    const connectionIds = connections.map(c => c._id);
    const lastMessages =
      connectionIds.length === 0
        ? []
        : await Message.aggregate([
            { $match: { connectionId: { $in: connectionIds } } },
            { $sort: { timestamp: -1 } },
            {
              $group: {
                _id: '$connectionId',
                text: { $first: '$text' },
                timestamp: { $first: '$timestamp' }
              }
            }
          ]);

    // Map messages for easy lookup
    const messageMap = new Map(lastMessages.map(m => [m._id.toString(), m]));

    // 3. Format response
    const formatted = connections.map((c) => {
      const otherUser = c.users.find(u => u && u._id.toString() !== req.userId);
      const lastMsg = messageMap.get(c._id.toString());
      
      return {
        id: c._id,
        user: otherUser,
        status: c.status,
        createdAt: c.createdAt,
        lastMessage: lastMsg ? {
          text: lastMsg.text,
          createdAt: lastMsg.timestamp
        } : null
      };
    });

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
router.delete('/:id', auth, validate({ params: connectionIdParamSchema }), async (req, res) => {
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
router.get('/online', auth, async (req, res) => {
  try {
    const connections = await Connection.find({ 
      users: req.userId, 
      status: { $in: ['active', 'matched'] } 
    })
      .populate('users', 'username profilePic onlineStatus')
      .limit(20)
      .lean();

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
