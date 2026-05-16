const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const auth = require('../middleware/auth');

const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  getUserCounts
} = require('../utils/stats');



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
  const label = `notifications_${Date.now()}`;
  console.time(label);
  try {
    const limit = Math.min(50, Math.max(10, Number(req.query.limit) || 20));
    
    const query = { 
      user: new mongoose.Types.ObjectId(req.userId),
      type: { $in: ['match', 'announcement', 'alert', 'system', 'info', 'security'] }
    };

    // Debugging: Explain query if requested
    if (req.query.explain) {
      const explanation = await Notification.find(query).sort({ createdAt: -1 }).limit(limit).explain('executionStats');
      return res.json(explanation);
    }

    // Benchmark: Raw MongoDB Driver (.toArray())
    if (req.query.benchmark) {
      const rawResults = await Notification.collection.find({ 
        user: new mongoose.Types.ObjectId(req.userId) 
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      console.timeEnd(label);
      return res.json({ benchmark: true, count: rawResults.length, data: rawResults });
    }

    // Main query (Heavily Optimized)
    const notifications = await Notification.find(query)
      .select('type content fromUser relatedId isRead createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .maxTimeMS(2000)
      .lean();

    // formatting is fast since fromUser is embedded
    console.timeEnd(label);
    res.json(notifications);

  } catch (err) {
    console.error('[NOTIFY ERROR]:', err);
    res.status(500).json({ error: 'Server error' });
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

    // Use cache (TTL 15s) to prevent hammering the DB on every initial load
    const counts = await getUserCounts(req.userId, false);

    const duration = Date.now() - start;

    if (duration > 100) {
      console.log(
        `[COUNT] took ${duration}ms`
      );
    }

    res.json(counts);

  } catch (err) {
    console.error('[COUNT ERROR]:', err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// DELETE ONE
// ======================================================

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const wasUnread = !notification.isRead;
    await notification.deleteOne();

    if (wasUnread) {
      await User.updateOne(
        { _id: req.userId },
        { $inc: { notificationCount: -1 } }
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error('[DELETE ERROR]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// ======================================================
// BULK DELETE
// ======================================================

router.post('/bulk-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }

    // Filter valid object IDs
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    // Find unread count in selection for counter sync
    const unreadCount = await Notification.countDocuments({
      _id: { $in: validIds },
      user: req.userId,
      isRead: false
    });

    const result = await Notification.deleteMany({
      _id: { $in: validIds },
      user: req.userId
    });

    if (unreadCount > 0) {
      await User.updateOne(
        { _id: req.userId },
        { $inc: { notificationCount: -unreadCount } }
      );
    }

    res.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });

  } catch (err) {
    console.error('[BULK DELETE ERROR]:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
