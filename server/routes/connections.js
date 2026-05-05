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