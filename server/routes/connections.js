// routes/connection.routes.js

const express = require('express');
const router = express.Router();

const Connection = require('../models/Connection');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { connectionIdParamSchema } = require('../validators/connection.validator');


// 🔥 GET connections (ZERO JOIN VERSION)
router.get('/', auth, async (req, res) => {
  try {
    const connections = await Connection.find({
      users: req.userId,
      status: { $in: ['active', 'matched'] }
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('users', 'username profilePic onlineStatus')
      .lean();

    const formatted = connections.map((c) => {
      // Use populated live users array (more reliable for onlineStatus and existing connections)
      const usersList = c.users || c.userDetails || [];
      const otherUser = usersList.find(
        (u) => u && u._id.toString() !== req.userId
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


// 🔥 ONLINE connections (keep your optimized logic)
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