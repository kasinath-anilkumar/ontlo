const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const auth = require('../middleware/auth');

const Notification = require('../models/Notification');
const User = require('../models/User');



// ======================================================
// HEALTH CHECK
// ======================================================

router.get('/health/check', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date()
  });
});



// ======================================================
// TEST COUNT
// ======================================================

router.get('/test/count', async (req, res) => {
  try {
    const start = Date.now();

    const count = await Notification.countDocuments({});

    const duration = Date.now() - start;

    console.log(
      `[TEST] Notification count: ${count}, took ${duration}ms`
    );

    res.json({
      count,
      duration
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});



// ======================================================
// GET NOTIFICATIONS
// ======================================================

router.get('/', auth, async (req, res) => {
  try {
    const start = Date.now();

    const notifications = await Notification.find(
      { user: req.userId },

      // 🔥 FETCH ONLY NEEDED FIELDS
      `
      type
      content
      fromUser
      relatedId
      isRead
      readAt
      createdAt
      `
    )
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // ======================================================
    // FORMAT RESPONSE
    // ======================================================

    const formatted = notifications.map((n) => {

      // Ensure fromUser object structure for consistency
      if (
        n.fromUser &&
        typeof n.fromUser === 'string'
      ) {
        n.fromUser = {
          _id: n.fromUser,
          username: 'User',
          profilePic: ''
        };
      }

      return n;
    });

    const duration = Date.now() - start;

    if (duration > 500) {
      console.warn(
        `[NOTIFY SLOW] Fetch took ${duration}ms`
      );
    }

    res.json(formatted);

  } catch (err) {
    console.error('[NOTIFY ERROR]:', err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// MARK ONE AS READ
// ======================================================

router.patch('/:id/read', auth, async (req, res) => {
  try {
    // 🔥 VALIDATE OBJECT ID
    if (
      !mongoose.Types.ObjectId.isValid(req.params.id)
    ) {
      return res.status(400).json({
        error: 'Invalid notification ID'
      });
    }

    const start = Date.now();

    const result = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      },
      {
        new: true
      }
    );

    // 🔥 DECREMENT USER COUNTER
    if (result) {
      await User.updateOne(
        {
          _id: req.userId
        },
        {
          $inc: {
            notificationCount: -1
          }
        }
      );
    }

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(
        `[SLOW] Mark read took ${duration}ms`
      );
    }

    res.json({
      message: 'Marked as read'
    });

    // 🔥 SOCKET EVENT
    if (req.io) {
      req.io
        .to(`user_${req.userId}`)
        .emit('notification-read', {
          id: req.params.id
        });
    }

  } catch (err) {
    console.error('[READ ERROR]:', err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// MARK ALL AS READ
// ======================================================

router.post('/read-all', auth, async (req, res) => {
  try {
    const start = Date.now();

    await Notification.updateMany(
      {
        user: req.userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // 🔥 RESET USER COUNTER
    await User.updateOne(
      {
        _id: req.userId
      },
      {
        $set: {
          notificationCount: 0
        }
      }
    );

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(
        `[SLOW] Read all took ${duration}ms`
      );
    }

    res.json({
      message: 'All marked as read'
    });

    // 🔥 SOCKET EVENT
    if (req.io) {
      req.io
        .to(`user_${req.userId}`)
        .emit('notifications-cleared');
    }

  } catch (err) {
    console.error('[READ ALL ERROR]:', err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// GET NOTIFICATION COUNTS
// ======================================================

router.get('/counts', auth, async (req, res) => {
  try {
    const start = Date.now();

    // 🔥 INSTANT COUNT FROM USER MODEL
    const user = await User.findById(req.userId)
      .select('notificationCount')
      .lean();

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(
        `[COUNT] took ${duration}ms`
      );
    }

    res.json({
      notifications:
        user?.notificationCount || 0
    });

  } catch (err) {
    console.error('[COUNT ERROR]:', err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});



module.exports = router;