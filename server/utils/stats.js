const mongoose = require('mongoose');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Connection = require('../models/Connection');

// In-memory cache and request deduplication
const countCache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 2000; // 2 seconds cache

/**
 * Calculates unread counts and connection stats for a user
 * Optimized with caching and request deduplication
 */
const getUserCounts = async (userId) => {
  const userIdStr = userId.toString();

  // 1. Check Cache
  const cachedData = countCache.get(userIdStr);
  if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
    return cachedData.data;
  }

  // 2. Check for pending request (Deduplication)
  if (pendingRequests.has(userIdStr)) {
    return pendingRequests.get(userIdStr);
  }

  // 3. Execute Query
  const fetchPromise = (async () => {
    try {
      const [unreadNotifications, user, perChatResults] = await Promise.all([
        Notification.countDocuments({ user: userId, isRead: false }),
        User.findById(userId).select('connections'),
        Message.aggregate([
          { 
            $match: { 
              isRead: false, 
              sender: { $ne: new mongoose.Types.ObjectId(userId) } 
            } 
          },
          { $group: { _id: "$connectionId", count: { $sum: 1 } } }
        ])
      ]);

      const perChat = {};
      let totalUnreadMessages = 0;
      perChatResults.forEach(r => {
        const count = r.count || 0;
        perChat[r._id.toString()] = count;
        totalUnreadMessages += 1;
      });

      const result = {
        messages: totalUnreadMessages,
        notifications: unreadNotifications,
        connections: user?.connections ? user.connections.length : 0,
        perChat
      };

      // Update Cache
      countCache.set(userIdStr, {
        timestamp: Date.now(),
        data: result
      });

      return result;
    } catch (err) {
      console.error('Error fetching user counts:', err);
      return { messages: 0, notifications: 0, connections: 0, perChat: {} };
    } finally {
      // Cleanup pending request
      pendingRequests.delete(userIdStr);
    }
  })();

  pendingRequests.set(userIdStr, fetchPromise);
  return fetchPromise;
};

/**
 * Returns a list of users currently online that this user is connected with
 */
const getOnlineConnections = async (userId) => {
  try {
    const connections = await Connection.find({ users: userId })
      .populate('users', 'username profilePic onlineStatus age gender location bio fullName');
    
    return connections
      .map(c => {
        const otherUser = c.users.find(u => u && u._id.toString() !== userId.toString());
        return otherUser && otherUser.onlineStatus ? { id: c._id, user: otherUser } : null;
      })
      .filter(u => u !== null);
  } catch (err) {
    console.error('Error fetching online connections:', err);
    return [];
  }
};

module.exports = {
  getUserCounts,
  getOnlineConnections
};
