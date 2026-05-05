const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Connection = require('../models/Connection');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const validate = require('../middleware/validate');
const { connectionIdParamSchema } = require('../validators/connection.validator');

// Get user connections with last message (optimized with aggregation)
router.get('/', auth, async (req, res) => {
  try {
    const connections = await Connection.aggregate([
      { $match: { users: mongoose.Types.ObjectId(req.userId), status: { $in: ['active', 'matched'] } } },
      { $sort: { updatedAt: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: 'users',
          foreignField: '_id',
          as: 'users',
          pipeline: [
            { $project: { username: 1, profilePic: 1, onlineStatus: 1 } }
          ]
        }
      }
    ]);

    // 2. Fetch last messages for all connections in ONE query
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

// Get only online connections (Optimized with caching)
router.get('/online', auth, async (req, res) => {
  try {
    const { getOnlineConnections } = require('../utils/stats');
    const onlineOnes = await getOnlineConnections(req.userId);
    res.json(onlineOnes);
  } catch (error) {
    console.error('[Online Connections Error]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
