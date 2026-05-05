const express = require('express');
const router = express.Router();

const Message = require('../models/Message');
const Connection = require('../models/Connection');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { connectionIdParamSchema } = require('../validators/message.validator');


// 🔒 Check connection membership
const requireConnectionMember = async (req, res, next) => {
  try {
    if (!req.connection) {
      const connection = await Connection.findOne({
        _id: req.params.connectionId,
        users: req.userId
      })
        .select('_id users')
        .lean();

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      req.connection = connection;
    }

    next();

  } catch (error) {
    res.status(400).json({ error: 'Invalid connection id' });
  }
};


/////////////////////////////////////////////////////
// 🔥 SEND MESSAGE
/////////////////////////////////////////////////////

router.post('/:connectionId', auth, validate({ params: connectionIdParamSchema }), requireConnectionMember, async (req, res) => {
  try {
    const { text, imageUrl } = req.body;

    if ((!text || !text.trim()) && !imageUrl) {
      return res.status(400).json({ error: 'Message text or image required' });
    }

    const now = new Date();

    // 1️⃣ Create message (NO timestamp field)
    const message = await Message.create({
      connectionId: req.params.connectionId,
      sender: req.userId,
      text: text ? text.trim() : undefined,
      imageUrl
    });

    // 2️⃣ Update connection (non-blocking)
    Connection.findByIdAndUpdate(req.params.connectionId, {
      lastMessage: {
        text: message.text || (message.imageUrl ? '📷 Image' : ''),
        createdAt: message.createdAt
      },
      updatedAt: now
    }).catch(err => console.error('lastMessage update failed:', err));

    res.json({
      id: message._id,
      text: message.text || "",
      imageUrl: message.imageUrl || null,
      createdAt: message.createdAt
    });

  } catch (error) {
    console.error('[SEND MESSAGE ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


/////////////////////////////////////////////////////
// 📩 GET MESSAGE HISTORY
/////////////////////////////////////////////////////

router.get('/:connectionId', auth, validate({ params: connectionIdParamSchema }), requireConnectionMember, async (req, res) => {
  try {
    const messages = await Message.find({ connectionId: req.params.connectionId })
      .select('_id text imageUrl sender createdAt isRead') // ✅ fixed
      .sort({ createdAt: 1 }) // ✅ fixed
      .limit(100)
      .lean();

    const userIdStr = req.userId.toString();

    const formatted = messages.map(m => ({
      id: m._id.toString(),
      text: m.text || "",
      imageUrl: m.imageUrl || null,
      sender: m.sender.toString() === userIdStr ? 'You' : 'Remote',
      createdAt: m.createdAt,
      type: m.sender.toString() === userIdStr ? 'self' : 'remote',
      isRead: m.isRead
    }));

    res.json(formatted);

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


/////////////////////////////////////////////////////
// ✅ MARK AS READ
/////////////////////////////////////////////////////

router.post('/:connectionId/read', auth, validate({ params: connectionIdParamSchema }), requireConnectionMember, async (req, res) => {
  try {
    await Message.updateMany(
      {
        connectionId: req.params.connectionId,
        sender: { $ne: req.userId },
        isRead: false
      },
      { isRead: true }
    );

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;