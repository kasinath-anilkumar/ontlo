const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

const { getUserCounts } = require('../utils/stats');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const counts = await getUserCounts(req.userId);
    
    res.json({
      connections: counts.connections,
      messages: counts.messages,
      notifications: counts.notifications,
      likes: 0
    });
  } catch (error) {
    console.error('[Stats API Error]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
