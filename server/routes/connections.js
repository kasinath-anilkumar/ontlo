const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Connection = require('../models/Connection');

const auth = require('../middleware/auth');

const validate = require('../middleware/validate');

const {
  connectionIdParamSchema
} = require('../validators/connection.validator');



// ======================================================
// GET CONNECTIONS
// ======================================================

router.get('/', auth, async (req, res) => {
  try {

    const start = Date.now();

    const connections = await Connection.find(
      {
        users: req.userId,
        status: 'active'
      },

      // 🔥 FETCH ONLY NEEDED FIELDS
      `
      users
      userDetails
      lastMessage
      createdAt
      updatedAt
      status
      `
    )
      .sort({ updatedAt: -1 })
      .limit(20)
      .hint({
        users: 1,
        updatedAt: -1
      })
      .maxTimeMS(5000)
      .lean();

    const userIdStr = req.userId.toString();

    const formatted = connections
      .map((connection) => {

        // ======================================================
        // FIND OTHER USER
        // ======================================================

        const otherUser = (connection.userDetails || [])
          .find(
            (u) =>
              u &&
              u._id &&
              u._id.toString() !== userIdStr
          );

        // Invalid connection
        if (!otherUser) {
          return null;
        }

        return {
          id: connection._id,

          user: {
            _id: otherUser._id,
            username: otherUser.username || 'User',
            profilePic: otherUser.profilePic || '',
            onlineStatus:
              otherUser.onlineStatus || 'offline'
          },

          status: connection.status,

          lastMessage: connection.lastMessage || null,

          createdAt: connection.createdAt,

          updatedAt: connection.updatedAt
        };
      })
      .filter(Boolean);

    // ======================================================
    // FETCH PENDING REQUESTS (Doc Section 17.5)
    // ======================================================

    const Like = require('../models/Like');

    const matchRequests = await Like.find({
      toUser: req.userId
    })
      .populate('fromUser', 'username profilePic onlineStatus')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

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

    const duration = Date.now() - start;

    if (duration > 500) {
      console.warn(
        `[CONNECTIONS SLOW] took ${duration}ms`
      );
    }

    // Merge and return
    res.json([
      ...requestFormatted,
      ...formatted
    ]);

    // ======================================================
    // ASYNC MARK READ
    // ======================================================

    if (matchRequests.length > 0) {

      const unreadIds = matchRequests
        .filter(r => !r.isRead)
        .map(r => r._id);

      if (unreadIds.length > 0) {

        Like.updateMany(
          {
            _id: { $in: unreadIds }
          },
          {
            $set: {
              isRead: true,
              readAt: new Date()
            }
          }
        ).catch(err => {
          console.error('[MARK LIKES READ ERROR]:', err);
        });
      }
    }

  } catch (error) {

    console.error(
      '[CONNECTION FETCH ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
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
      // FIND CONNECTION
      // ======================================================

      const connection = await Connection.findOne({
        _id: req.params.id,
        users: req.userId
      })
        .select('_id')
        .lean();

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found'
        });
      }

      // ======================================================
      // DELETE
      // ======================================================

      await Connection.deleteOne({
        _id: req.params.id
      });

      // ======================================================
      // SOCKET UPDATE
      // ======================================================

      if (req.io) {
        req.io
          .to(`user_${req.userId}`)
          .emit('connection-deleted', {
            connectionId: req.params.id
          });
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
      await Notification.create({
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