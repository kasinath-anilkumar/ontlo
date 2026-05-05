// socket.js

const matchmaker = require('./services/Matchmaker');
const User = require('./models/User');
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const Notification = require('./models/Notification');

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config/jwt');
const { moderateText } = require('./utils/moderation');
const { getUserCounts } = require('./utils/stats');
const { attachMatchmakingProfile } = require('./utils/socketMatchProfile');

module.exports = (io) => {
  const onlineUsers = new Set();
  let lastOnlineCountEmit = 0;

  /////////////////////////////////////////////////////
  // 🔥 HELPERS
  /////////////////////////////////////////////////////

  const pushUserStats = async (userId) => {
    try {
      const counts = await getUserCounts(userId, false);
      io.to(`user_${userId}`).emit('counts-update', counts);
    } catch (err) {
      console.error('pushUserStats error:', err);
    }
  };

  const emitCountsDelta = (userId, delta) => {
    io.to(`user_${userId}`).emit('counts-delta', delta);
  };

  const notifyFriendsOnline = async (userId) => {
    try {
      const connections = await Connection.find({ users: userId })
        .select('users')
        .lean();

      const friendIds = connections
        .map(c => c.users.find(u => u.toString() !== userId.toString()))
        .filter(Boolean);

      friendIds.forEach(fid => {
        io.to(`user_${fid}`).emit('online-status-change', {
          userId,
          isOnline: onlineUsers.has(userId.toString())
        });
      });

    } catch (err) {
      console.error('notifyFriendsOnline error:', err);
    }
  };

  /////////////////////////////////////////////////////
  // 🔥 SOCKET CONNECTION
  /////////////////////////////////////////////////////

  io.on('connection', async (socket) => {
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';').reduce((res, c) => {
        const [key, val] = c.trim().split('=').map(decodeURIComponent);
        try {
          return Object.assign(res, { [key]: JSON.parse(val) });
        } catch {
          return Object.assign(res, { [key]: val });
        }
      }, {});
      token = cookies.token;
    }

    /////////////////////////////////////////////////////
    // 🔐 AUTH
    /////////////////////////////////////////////////////

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;

        const user = await attachMatchmakingProfile(socket);
        socket.user = user; // 🔥 store for reuse

        if (user) {
          socket.join(`user_${socket.userId}`);

          if (user.role === 'user') {
            const userIdStr = socket.userId.toString();

            // 🔥 MEMORY ONLY (NO DB WRITE)
            onlineUsers.add(userIdStr);

            pushUserStats(userIdStr);
            notifyFriendsOnline(userIdStr);

            const now = Date.now();
            if (now - lastOnlineCountEmit > 5000) {
              lastOnlineCountEmit = now;
              io.emit('online-count', { count: onlineUsers.size });
            }
          }

          matchmaker.handleReconnect(socket, io);
        }

      } catch (err) {
        console.error('Socket Auth Error:', err.message);
      }
    }

    /////////////////////////////////////////////////////
    // 💬 CHAT MESSAGE
    /////////////////////////////////////////////////////

    socket.on('chat-message', async ({ message, imageUrl, roomId }) => {
      if (!socket.rooms.has(roomId)) return;

      const moderation = moderateText(message);
      const finalMessage = moderation.text;
      const timestamp = new Date();

      socket.to(roomId).emit('chat-message', {
        sender: socket.id,
        message: finalMessage,
        imageUrl,
        createdAt: timestamp
      });

      // 🔥 SAVE MESSAGE + UPDATE CONNECTION
      try {
        const conn = await Connection.findById(roomId).select('users').lean();
        if (!conn) return;

        const newMessage = await Message.create({
          connectionId: roomId,
          sender: socket.userId,
          text: finalMessage,
          imageUrl
        });

        // 🔥 UPDATE LAST MESSAGE (IMPORTANT)
        await Connection.findByIdAndUpdate(roomId, {
          lastMessage: {
            text: finalMessage,
            createdAt: timestamp
          },
          updatedAt: timestamp
        });

        const recipientId = conn.users.find(
          u => u.toString() !== socket.userId.toString()
        );

        if (recipientId) {
          // 🔥 ZERO JOIN NOTIFICATION
          await Notification.create({
            user: recipientId,
            type: 'message',
            content: finalMessage.substring(0, 50),

            fromUser: {
              _id: socket.user._id,
              username: socket.user.username,
              profilePic: socket.user.profilePic
            },

            relatedId: roomId
          });

          // 🔥 PUSH REALTIME
          io.to(`user_${recipientId}`).emit('new-notification', {
            type: 'message',
            content: finalMessage.substring(0, 50),
            fromUser: socket.user,
            relatedId: roomId
          });

          emitCountsDelta(recipientId.toString(), {
            messages: 1,
            notifications: 1,
            perChat: { [roomId]: 1 }
          });
        }

      } catch (err) {
        console.error('Message error:', err);
      }
    });

    /////////////////////////////////////////////////////
    // 🔌 DISCONNECT
    /////////////////////////////////////////////////////

    socket.on('disconnect', async () => {
      try {
        if (socket.userId) {
          const userIdStr = socket.userId.toString();

          const sockets = await io.in(`user_${userIdStr}`).fetchSockets();

          if (sockets.length === 0) {
            onlineUsers.delete(userIdStr);

            notifyFriendsOnline(userIdStr);

            const now = Date.now();
            if (now - lastOnlineCountEmit > 5000) {
              lastOnlineCountEmit = now;
              io.emit('online-count', { count: onlineUsers.size });
            }
          }
        }

        matchmaker.handleDisconnect(socket, io);

      } catch (err) {
        console.error('Disconnect error:', err);
      }
    });
  });
};