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

const cacheUtil = require('../utils/cache');

const {
  moderateText
} = require('../utils/moderation');

// ======================================================
// HELPER: PROFILING
// ======================================================
const logDuration = (label, start) => {
  const duration = Date.now() - start;
  if (duration > 150) {
    console.warn(`[PERFORMANCE WARNING] ${label} took ${duration}ms`);
  } else {
    console.log(`[DEBUG] ${label} completed in ${duration}ms`);
  }
};

// ======================================================
// MIDDLEWARE: OPTIMIZED CONNECTION MEMBERSHIP CHECK
// ======================================================
const requireConnectionMember = async (req, res, next) => {
  const label = `membership_${Date.now()}`;
  console.time(label);
  try {
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }

    // Optimization: Connection.findOne with projection and lean is extremely fast
    // We fetch users to avoid redundant lookups in route handlers (e.g. for Socket.io emits)
    const connection = await Connection.findOne({
      _id: new mongoose.Types.ObjectId(connectionId),
      users: new mongoose.Types.ObjectId(req.userId),
      status: 'active'
    }).maxTimeMS(5000).lean();
 
    if (!connection) {
      console.timeEnd(label);
      return res.status(404).json({ error: 'Connection not found or inactive' });
    }
 
    // Attach to request for reuse
    req.connection = connection;
    console.timeEnd(label);
    next();
  } catch (error) {
    console.error('[CONNECTION MEMBER ERROR]:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ======================================================
// SEND MESSAGE (OPTIMIZED)
// ======================================================
router.post(
  '/:connectionId',
  auth,
  validate({ params: connectionIdParamSchema }),
  requireConnectionMember,
  async (req, res) => {
    const label = `send_msg_${Date.now()}`;
    console.time(label);
    try {
      const { text, imageUrl } = req.body;

      if ((!text || !text.trim()) && !imageUrl) {
        return res.status(400).json({ error: 'Message text or image required' });
      }

      // Optimization: Reuse connection from middleware
      const connection = req.connection;
      if (!connection) return res.status(404).json({ error: 'Connection lost' });

      // Moderation (Synchronous, fast)
      const moderation = moderateText(text || '');
      const finalMessage = moderation.text;

      // Get sender snapshot from pre-loaded connection
      const senderInfo = connection.userDetails.find(
        (u) => u._id.toString() === req.userId.toString()
      );

      // Create Message
      const message = await Message.create({
        connectionId: req.params.connectionId,
        sender: req.userId,
        senderInfo: senderInfo ? {
          _id: senderInfo._id,
          username: senderInfo.username,
          profilePic: senderInfo.profilePic
        } : undefined,
        text: finalMessage ? finalMessage.trim() : undefined,
        imageUrl: imageUrl || null
      });

      // Fire-and-forget Connection Update
      Connection.updateOne(
        { _id: req.params.connectionId },
        {
          $set: {
            'lastMessage.text': message.text || (message.imageUrl ? '📷 Image' : ''),
            'lastMessage.sender': req.userId,
            'lastMessage.createdAt': message.createdAt,
            updatedAt: new Date()
          },
          $inc: { messageCount: 1 }
        }
      ).catch(err => console.error('[LAST MESSAGE UPDATE ERROR]:', err));

      // Socket Event
      if (req.io) {
        connection.users.forEach((userId) => {
          req.io.to(`user_${userId}`).emit('new-message', {
            id: message._id,
            connectionId: req.params.connectionId,
            text: message.text || '',
            imageUrl: message.imageUrl,
            sender: req.userId,
            createdAt: message.createdAt
          });
        });
      }

      // Invalidate cache
      cacheUtil.delPattern(`msg_history_${req.params.connectionId}`);

      console.timeEnd(label);

      res.json({
        id: message._id,
        text: message.text || '',
        imageUrl: message.imageUrl || null,
        sender: req.userId,
        createdAt: message.createdAt,
        isRead: message.isRead
      });
    } catch (error) {
      console.error('[SEND MESSAGE ERROR]:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ======================================================
// GET MESSAGE HISTORY (HEAVILY OPTIMIZED)
// ======================================================
router.get(
  '/:connectionId',
  auth,
  validate({ params: connectionIdParamSchema }),
  requireConnectionMember,
  async (req, res) => {
    const label = `history_${Date.now()}`;
    console.time(label);
    try {
      const connectionId = req.params.connectionId;
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const before = req.query.before;
      
      const query = { 
        connectionId: new mongoose.Types.ObjectId(connectionId) 
      };

      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      // 1. Raw Mongo Benchmark (As requested)
      if (req.query.benchmark) {
        console.time("raw_mongo");
        const rawResults = await Message.collection.find(query)
          .project({ text: 1, sender: 1, receiver: 1, createdAt: 1, isRead: 1 })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();
        console.timeEnd("raw_mongo");
        return res.json({ benchmark: true, count: rawResults.length, data: rawResults });
      }

      // 2. Explain query if requested
      if (req.query.explain) {
        const explanation = await Message.find(query)
          .select("text sender receiver createdAt isRead")
          .sort({ createdAt: -1 })
          .limit(limit)
          .explain('executionStats');
        return res.json(explanation);
      }

      const cacheKey = `msg_history_${connectionId}_b${before || 'now'}_l${limit}`;
      const cached = cacheUtil.get(cacheKey);
      if (cached && !req.query.benchmark && !req.query.explain) {
        return res.json(cached);
      }

      // 3. Simplified Query (Targeting connectionId index exclusively)
      // Casting to ObjectId ensures index compatibility
      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .maxTimeMS(5000) // Fail fast if query hangs
        .lean();

      // 4. Fast Formatting
      const userIdStr = req.userId.toString();
      const formatted = messages.reverse().map((m) => {
        const isSelf = m.sender?.toString() === userIdStr;
        return {
          id: m._id.toString(),
          text: m.text || '',
          imageUrl: m.imageUrl || null,
          sender: m.sender,
          isSelf,
          senderInfo: m.senderInfo || null,
          createdAt: m.createdAt,
          type: isSelf ? 'self' : 'remote',
          isRead: m.isRead,
          readAt: m.readAt
        };
      });

      // Cache the result (5 min TTL)
      if (!req.query.benchmark && !req.query.explain) {
        cacheUtil.set(cacheKey, formatted, 300);
      }

      console.timeEnd(label);
      res.json(formatted);

    } catch (error) {
      console.error('[MESSAGE HISTORY ERROR]:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ======================================================
// MARK MESSAGES AS READ (OPTIMIZED)
// ======================================================
router.post(
  '/:connectionId/read',
  auth,
  validate({ params: connectionIdParamSchema }),
  requireConnectionMember,
  async (req, res) => {
    const start = Date.now();
    try {
      // Optimization: Uses compound index { connectionId: 1, sender: 1, isRead: 1 }
      const result = await Message.updateMany(
        {
          connectionId: req.params.connectionId,
          sender: { $ne: req.userId },
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      ).maxTimeMS(1000);

      if (result.modifiedCount > 0 && req.io) {
        req.connection.users.forEach((userId) => {
          req.io.to(`user_${userId}`).emit('messages-read', {
            connectionId: req.params.connectionId,
            readBy: req.userId
          });
        });
      }

      // Invalidate cache on read receipt
      cacheUtil.delPattern(`msg_history_${req.params.connectionId}`);

      logDuration(`Mark as read in ${req.params.connectionId} (${result.modifiedCount} msgs)`, start);
      res.json({ success: true, count: result.modifiedCount });

    } catch (error) {
      console.error('[READ MESSAGE ERROR]:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;