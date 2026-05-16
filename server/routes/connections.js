const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Connection = require('../models/Connection');

const auth = require('../middleware/auth');

const validate = require('../middleware/validate');

const User = require('../models/User');

const {
  emitConnectionDeleted,
  emitCountsUpdate,
  emitNotification,
  formatConnectionForUser
} = require('../utils/realtime');

const {
  connectionIdParamSchema
} = require('../validators/connection.validator');



// ======================================================
// GET CONNECTIONS
// ======================================================

router.get('/', auth, async (req, res) => {
  const label = `connections_${Date.now()}`;
  console.time(label);
  try {
    const userIdStr = req.userId.toString();
    const limit = Math.min(50, Number(req.query.limit) || 20);

    // 1. Parallel Data Fetching
    const [connections, matchRequests] = await Promise.all([
      Connection.find(
        { users: req.userId, status: 'active' },
        'users userDetails lastMessage createdAt updatedAt status'
      )
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),

      require('../models/Like').find({
        toUser: req.userId
      })
        .select('fromUser createdAt isRead')
        .populate('fromUser', 'username profilePic onlineStatus')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    // explain query if requested
    if (req.query.explain) {
      const explanation = await Connection.find({ users: req.userId, status: 'active' }).explain('executionStats');
      return res.json(explanation);
    }

    // 2. Targeted Online Check (Only for the users we are returning)
    const otherUserIds = connections
      .map(c => c.users.find(u => u.toString() !== userIdStr))
      .filter(Boolean);

    const onlineUsers = await User.find(
      { _id: { $in: otherUserIds }, onlineStatus: 'online' },
      '_id'
    ).lean();

    const onlineSet = new Set(onlineUsers.map(u => u._id.toString()));

    // 3. Formatting
    const formatted = connections.map((connection) => {
      const otherUser = (connection.userDetails || [])
        .find(u => u && u._id && u._id.toString() !== userIdStr);

      if (!otherUser) return null;

      return formatConnectionForUser({
        ...connection,
        userDetails: connection.userDetails.map(u => ({
          ...u,
          onlineStatus: onlineSet.has(u._id.toString()) ? 'online' : 'offline'
        }))
      }, req.userId);
    }).filter(Boolean);

    const requestFormatted = matchRequests.map((r) => {
      if (!r.fromUser) return null;
      return {
        id: r._id,
        user: {
          _id: r.fromUser._id,
          username: r.fromUser.username || 'User',
          profilePic: r.fromUser.profilePic || '',
          onlineStatus: r.fromUser.onlineStatus || 'offline'
        },
        status: 'pending',
        createdAt: r.createdAt,
        updatedAt: r.createdAt
      };
    }).filter(Boolean);

    console.timeEnd(label);

    res.json([
      ...requestFormatted,
      ...formatted
    ]);

    // Async Mark Read (Fire and forget)
    if (matchRequests.length > 0) {
      const unreadIds = matchRequests.filter(r => !r.isRead).map(r => r._id);
      if (unreadIds.length > 0) {
        require('../models/Like').updateMany(
          { _id: { $in: unreadIds } },
          { $set: { isRead: true, readAt: new Date() } }
        ).catch(err => console.error('[MARK LIKES READ ERROR]:', err));
      }
    }
  } catch (error) {
    console.error('[CONNECTION FETCH ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// ======================================================
// DELETE CONNECTION
// ======================================================

router.delete(
  '/:id',
  auth,
  validate({
    params: connectionIdParamSchema
  }),
  async (req, res) => {

    try {

      // ======================================================
      // VALIDATE OBJECT ID
      // ======================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          error: 'Invalid connection ID'
        });
      }

      // ======================================================
      // FIND CONNECTION OR LIKE
      // ======================================================

      let connection = await Connection.findOne({
        _id: req.params.id,
        users: req.userId
      })
        .select('_id users')
        .lean();

      let isLike = false;

      if (!connection) {
        // Check if it's a pending Like request instead
        const Like = require('../models/Like');
        connection = await Like.findOne({
          _id: req.params.id,
          toUser: req.userId
        }).select('_id').lean();

        if (connection) {
          isLike = true;
        }
      }

      if (!connection) {
        return res.status(404).json({
          error: 'Connection or request not found'
        });
      }

      // ======================================================
      // DELETE
      // ======================================================

      if (isLike) {
        const Like = require('../models/Like');
        await Like.deleteOne({ _id: req.params.id });
      } else {
        await Connection.deleteOne({ _id: req.params.id });

        // Cleanup orphaned messages
        const Message = require('../models/Message');
        await Message.deleteMany({ connectionId: req.params.id });

        // Cleanup orphaned notifications
        const Notification = require('../models/Notification');
        await Notification.deleteMany({ relatedId: req.params.id });
      }

      // ======================================================
      // SOCKET UPDATE
      // ======================================================

      if (req.io) {
        if (isLike) {
          emitCountsUpdate(req.io, req.userId);
        } else {
          emitConnectionDeleted(req.io, req.params.id, connection.users);
          connection.users.forEach((userId) => {
            emitCountsUpdate(req.io, userId);
          });
        }
      }

      res.json({
        message: 'Connection removed'
      });

    } catch (error) {

      console.error(
        '[DELETE CONNECTION ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// GET ONLINE CONNECTIONS
// ======================================================

router.get('/online', auth, async (req, res) => {

  try {

    const {
      getOnlineConnections
    } = require('../utils/stats');

    const onlineConnections =
      await getOnlineConnections(req.userId);

    res.json(onlineConnections);

  } catch (error) {

    console.error(
      '[ONLINE CONNECTION ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// PING / WAVE (Doc Section 17.4)
// ======================================================

router.post(
  '/:id/ping',
  auth,
  validate({
    params: connectionIdParamSchema
  }),
  async (req, res) => {

    try {

      const connection = await Connection.findOne({
        _id: req.params.id,
        users: req.userId,
        status: 'active'
      }).lean();

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found'
        });
      }

      const recipientId = connection.users.find(
        (u) => u.toString() !== req.userId.toString()
      );

      const sender = await User.findById(req.userId)
        .select('username profilePic')
        .lean();

      // Create Notification
      const Notification = require('../models/Notification');
      const notification = await Notification.create({
        user: recipientId,
        type: 'ping',
        content: `${sender.username} waved at you! 👋`,
        fromUser: {
          _id: sender._id,
          username: sender.username,
          profilePic: sender.profilePic
        },
        relatedId: connection._id
      });

      // Socket Event
      if (req.io) {
        emitNotification(req.io, recipientId, notification);
        emitCountsUpdate(req.io, recipientId);
        /*
        req.io
          .to(`user_${recipientId}`)
          .emit('new-notification', {
            type: 'ping',
            content: `${sender.username} waved at you! 👋`,
            fromUser: {
              _id: sender._id,
              username: sender.username,
              profilePic: sender.profilePic
            },
            connectionId: connection._id
          });
        */
      }

      res.json({
        message: 'Ping sent successfully'
      });

    } catch (error) {

      console.error(
        '[PING ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



module.exports = router;
