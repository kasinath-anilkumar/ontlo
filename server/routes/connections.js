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

    const duration = Date.now() - start;

    if (duration > 500) {
      console.warn(
        `[CONNECTIONS SLOW] took ${duration}ms`
      );
    }

    res.json(formatted);

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



module.exports = router;