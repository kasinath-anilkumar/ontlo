const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Connection = require('../models/Connection');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { connectionIdParamSchema } = require('../validators/message.validator');


const requireConnectionMember = async (req, res, next) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      users: req.userId
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    req.connection = connection;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid connection id' });
  }
};

// Get message history for a connection
router.get('/:connectionId', auth, validate({ params: connectionIdParamSchema }), requireConnectionMember, async (req, res) => {
  try {
    const messages = await Message.find({ connectionId: req.params.connectionId })
      .sort({ timestamp: 1 })
      .limit(100);
    
    // Format for frontend
    const formatted = messages.map(m => ({
      id: m._id.toString(),
      text: m.text,
      sender: m.sender.toString() === req.userId ? 'You' : 'Remote',
      timestamp: m.timestamp,
      type: m.sender.toString() === req.userId ? 'self' : 'remote',
      isRead: m.isRead
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.post('/:connectionId/read', auth, validate({ params: connectionIdParamSchema }), requireConnectionMember, async (req, res) => {
  try {
    await Message.updateMany(
      { connectionId: req.params.connectionId, sender: { $ne: req.userId } },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
