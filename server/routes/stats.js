const express = require('express');

const router = express.Router();

const auth = require('../middleware/auth');

const {
  getUserCounts,
  getOnlineConnections
} = require('../utils/stats');



// ======================================================
// GET USER STATS
// ======================================================

router.get('/', auth, async (req, res) => {

  try {

    const start = Date.now();

    const counts =
      await getUserCounts(req.userId);

    const duration =
      Date.now() - start;

    // ======================================================
    // PERFORMANCE LOG
    // ======================================================

    if (duration > 100) {

      console.warn(
        `[STATS SLOW] ${duration}ms`
      );
    }

    res.json({

      connections:
        counts.connections || 0,

      messages:
        counts.messages || 0,

      notifications:
        counts.notifications || 0,

      likes:
        counts.likes || 0,

      perChat:
        counts.perChat || {}
    });

  } catch (error) {

    console.error(
      '[STATS ROUTE ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// GET ONLINE CONNECTIONS
// ======================================================

router.get(
  '/online',

  auth,

  async (req, res) => {

    try {

      const onlineConnections =
        await getOnlineConnections(
          req.userId
        );

      res.json(onlineConnections);

    } catch (error) {

      console.error(
        '[ONLINE CONNECTIONS ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



module.exports = router;