// routes/connection.routes.js

const express = require('express');
const router = express.Router();

const Connection = require('../models/Connection');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { connectionIdParamSchema } = require('../validators/connection.validator');


// 🔥 GET connections (FINAL OPTIMIZED)
router.get('/', auth, async (req, res) => {
  try {
    const connections = await Connection.find({
      users: req.userId,
      status: 'active'
    })
      .select('userDetails lastMessage createdAt updatedAt status') // 🔥 important
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const userIdStr = req.userId.toString();

    const formatted = connections.map((c) => {
      const otherUser = c.userDetails?.find(
        (u) => u && u._id.toString() !== userIdStr
      );

      return {
        id: c._id,
        user: otherUser || null,
        status: c.status,
        createdAt: c.createdAt,
        lastMessage: c.lastMessage || null
      };
    });

    res.json(formatted);

  } catch (error) {
    console.error('[CONNECTION ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔥 DELETE connection
router.delete(
  '/:id',
  auth,
  validate({ params: connectionIdParamSchema }),
  async (req, res) => {
    try {
      const connection = await Connection.findOne({
        _id: req.params.id,
        users: req.userId
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      await Connection.deleteOne({ _id: req.params.id });
      res.json({ message: 'Connection removed' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// 🔥 ONLINE connections
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