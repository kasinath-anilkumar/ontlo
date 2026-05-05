const mongoose = require('mongoose');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Connection = require('../models/Connection');

// In-memory cache and request deduplication
const countCache = new Map();
const onlineCache = new Map();
const pendingCounts = new Map();
const pendingOnline = new Map();
const CACHE_TTL = 15000; // 15 seconds cache

/**
 * Calculates unread counts and connection stats for a user
 * Optimized with caching and request deduplication
 */
const getUserCounts = async (userId, forceRefresh = false) => {
  if (!userId) return { messages: 0, notifications: 0, connections: 0, perChat: {} };
  const userIdStr = userId.toString();
  const startTime = Date.now();

  // 1. Check Cache (unless forcing refresh)
  if (!forceRefresh) {
    const cachedData = countCache.get(userIdStr);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      return cachedData.data;
    }
  }

  // 2. Check for pending request (Deduplication)
  if (pendingCounts.has(userIdStr) && !forceRefresh) {
    return pendingCounts.get(userIdStr);
  }

  // 3. Execute Query
  const fetchPromise = (async () => {
    try {
      const oid = new mongoose.Types.ObjectId(userIdStr);
      
      // 1. Get the user's active connection IDs
      // Using .find().select().lean() is often faster than .distinct on free tier if the result set is small
      const connections = await Connection.find(
        { users: oid, status: { $in: ['active', 'matched'] } },
        { _id: 1 }
      ).lean();
      
      const connectionIds = connections.map(c => c._id);
      const connectionCount = connectionIds.length;

      const [unreadNotifications, perChatResults] = await Promise.all([
        Notification.countDocuments({ user: oid, isRead: false }),
        connectionIds.length === 0
          ? Promise.resolve([])
          : Message.aggregate([
              {
                $match: {
                  connectionId: { $in: connectionIds },
                  isRead: false,
                  sender: { $ne: oid }
                }
              },
              { $group: { _id: "$connectionId", count: { $sum: 1 } } }
            ]).hint({ connectionId: 1, isRead: 1 }) // Hint to use existing index
      ]);

      const perChat = {};
      let totalUnreadMessages = 0;
      perChatResults.forEach((r) => {
        const count = r.count || 0;
        perChat[r._id.toString()] = count;
        totalUnreadMessages += count;
      });

      const result = {
        messages: totalUnreadMessages,
        notifications: unreadNotifications,
        connections: connectionCount,
        perChat
      };

      // Update Cache
      countCache.set(userIdStr, {
        timestamp: Date.now(),
        data: result
      });

      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.log(`[Profiler] getUserCounts for ${userIdStr.slice(-4)} took ${duration}ms ${forceRefresh ? '(Forced)' : ''}`);
      }

      return result;
    } catch (err) {
      console.error('Error fetching user counts:', err);
      return { messages: 0, notifications: 0, connections: 0, perChat: {} };
    } finally {
      pendingCounts.delete(userIdStr);
    }
  })();

  if (!forceRefresh) pendingCounts.set(userIdStr, fetchPromise);
  return fetchPromise;
};

/**
 * Returns a list of users currently online that this user is connected with
 * Optimized with caching and request deduplication
 */
const getOnlineConnections = async (userId, forceRefresh = false) => {
  if (!userId) return [];
  const userIdStr = userId.toString();
  const startTime = Date.now();

  // 1. Check Cache (unless forcing refresh)
  if (!forceRefresh) {
    const cachedData = onlineCache.get(userIdStr);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      return cachedData.data;
    }
  }

  // 2. Check for pending request (Deduplication)
  if (pendingOnline.has(userIdStr) && !forceRefresh) {
    return pendingOnline.get(userIdStr);
  }

  // 3. Execute Query
  const fetchPromise = (async () => {
    try {
      const oid = new mongoose.Types.ObjectId(userIdStr);
      const connections = await Connection.find({ users: oid, status: 'active' })
        .populate('users', 'username profilePic onlineStatus')
        .lean();
      
      const result = connections
        .map(c => {
          const otherUser = c.users.find(u => u && u._id.toString() !== userIdStr);
          return otherUser && otherUser.onlineStatus ? { id: c._id, user: otherUser } : null;
        })
        .filter(u => u !== null);

      // Update Cache
      onlineCache.set(userIdStr, {
        timestamp: Date.now(),
        data: result
      });

      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.log(`[Profiler] getOnlineFriends for ${userIdStr.slice(-4)} took ${duration}ms ${forceRefresh ? '(Forced)' : ''}`);
      }

      return result;
    } catch (err) {
      console.error('Error fetching online connections:', err);
      return [];
    } finally {
      pendingOnline.delete(userIdStr);
    }
  })();

  if (!forceRefresh) pendingOnline.set(userIdStr, fetchPromise);
  return fetchPromise;
};

module.exports = {
  getUserCounts,
  getOnlineConnections
};
