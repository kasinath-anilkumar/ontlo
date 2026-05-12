const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Message = require('../models/Message');
const Connection = require('../models/Connection');
const User = require('../models/User');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const {
  connectionIdParamSchema
} = require('../validators/message.validator');

const {
  moderateText
} = require('../utils/moderation');



// ======================================================
// CHECK CONNECTION MEMBERSHIP
// ======================================================

const requireConnectionMember = async (
  req,
  res,
  next
) => {

  try {

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.connectionId
      )
    ) {
      return res.status(400).json({
        error: 'Invalid connection ID'
      });
    }

    const connection = await Connection.findOne(
      {
        _id: req.params.connectionId,
        users: req.userId,
        status: 'active'
      },

      `
      _id
      users
      userDetails
      status
      `
    ).lean();

    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found'
      });
    }

    req.connection = connection;

    next();

  } catch (error) {

    console.error(
      '[CONNECTION MEMBER ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
};



// ======================================================
// SEND MESSAGE
// ======================================================

router.post(
  '/:connectionId',

  auth,

  validate({
    params: connectionIdParamSchema
  }),

  requireConnectionMember,

  async (req, res) => {

    try {

      const {
        text,
        imageUrl
      } = req.body;

      // ======================================================
      // VALIDATION
      // ======================================================

      if (
        (!text || !text.trim()) &&
        !imageUrl
      ) {
        return res.status(400).json({
          error:
            'Message text or image required'
        });
      }

      // ======================================================
      // MODERATION
      // ======================================================

      const moderation =
        moderateText(text || '');

      const finalMessage =
        moderation.text;

      // ======================================================
      // GET SENDER SNAPSHOT
      // ======================================================

      const senderInfo =
        req.connection.userDetails.find(
          (u) =>
            u._id.toString() ===
            req.userId.toString()
        );

      // ======================================================
      // CREATE MESSAGE
      // ======================================================

      const message = await Message.create({

        connectionId: req.params.connectionId,

        sender: req.userId,

        senderInfo: senderInfo
          ? {
              _id: senderInfo._id,
              username:
                senderInfo.username,
              profilePic:
                senderInfo.profilePic
            }
          : undefined,

        text: finalMessage
          ? finalMessage.trim()
          : undefined,

        imageUrl:
          imageUrl || null
      });

      // ======================================================
      // UPDATE CONNECTION
      // ======================================================

      Connection.updateOne(
        {
          _id: req.params.connectionId
        },
        {
          $set: {
            lastMessage: {
              text:
                message.text ||
                (message.imageUrl
                  ? '📷 Image'
                  : ''),

              sender: req.userId,

              createdAt:
                message.createdAt
            },

            updatedAt: new Date()
          },

          $inc: {
            messageCount: 1
          }
        }
      ).catch((err) => {
        console.error(
          '[LAST MESSAGE UPDATE ERROR]:',
          err
        );
      });

      // ======================================================
      // SOCKET EVENT
      // ======================================================

      if (req.io) {

        req.connection.users.forEach(
          (userId) => {

            req.io
              .to(`user_${userId}`)
              .emit('new-message', {

                id: message._id,

                connectionId:
                  req.params.connectionId,

                text:
                  message.text || '',

                imageUrl:
                  message.imageUrl,

                sender:
                  req.userId,

                createdAt:
                  message.createdAt
              });
          }
        );
      }

      // ======================================================
      // RESPONSE
      // ======================================================

      res.json({

        id: message._id,

        text:
          message.text || '',

        imageUrl:
          message.imageUrl || null,

        sender: req.userId,

        createdAt:
          message.createdAt,

        isRead:
          message.isRead
      });

    } catch (error) {

      console.error(
        '[SEND MESSAGE ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// GET MESSAGE HISTORY
// ======================================================

router.get(
  '/:connectionId',

  auth,

  validate({
    params: connectionIdParamSchema
  }),

  requireConnectionMember,

  async (req, res) => {

    try {

      const mongoose = require('mongoose');
      const limit = Math.min(
        100,
        Math.max(20, Number(req.query.limit) || 50)
      );
      const query = {
        connectionId: req.params.connectionId,
        deletedFor: {
          $ne: new mongoose.Types.ObjectId(req.userId)
        }
      };

      if (req.query.before) {
        const beforeDate = new Date(req.query.before);
        if (!Number.isNaN(beforeDate.getTime())) {
          query.createdAt = { $lt: beforeDate };
        }
      }

      const messages = await Message.find(query,
        `
        text
        imageUrl
        sender
        senderInfo
        createdAt
        isRead
        readAt
        `
      )
        .sort({
          createdAt: -1
        })
        .limit(limit)
        .maxTimeMS(3000)
        .lean();

      const orderedMessages = messages.reverse();
      console.log(`[DEBUG] Found ${orderedMessages.length} messages for connection ${req.params.connectionId}`);

      const userIdStr =
        req.userId.toString();

      const formatted = orderedMessages.map(
        (m) => {

          const isSelf =
            m.sender.toString() ===
            userIdStr;

          return {

            id: m._id.toString(),

            text:
              m.text || '',

            imageUrl:
              m.imageUrl || null,

            sender:
              m.sender,

            isSelf,

            senderInfo:
              m.senderInfo || null,

            createdAt:
              m.createdAt,

            type: isSelf
              ? 'self'
              : 'remote',

            isRead:
              m.isRead,

            readAt:
              m.readAt
          };
        }
      );

      res.json(formatted);

    } catch (error) {

      console.error(
        '[MESSAGE HISTORY ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// MARK MESSAGES AS READ
// ======================================================

router.post(
  '/:connectionId/read',

  auth,

  validate({
    params: connectionIdParamSchema
  }),

  requireConnectionMember,

  async (req, res) => {

    try {

      await Message.updateMany(
        {
          connectionId:
            req.params.connectionId,

          sender: {
            $ne: new mongoose.Types.ObjectId(req.userId)
          },

          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      // ======================================================
      // SOCKET EVENT
      // ======================================================

      if (req.io) {

        req.connection.users.forEach(
          (userId) => {

            req.io
              .to(`user_${userId}`)
              .emit('messages-read', {

                connectionId:
                  req.params.connectionId,

                readBy:
                  req.userId
              });
          }
        );
      }

      res.json({
        success: true
      });

    } catch (error) {

      console.error(
        '[READ MESSAGE ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



module.exports = router;