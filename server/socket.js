const matchmaker = require('./services/Matchmaker');
const User = require('./models/User');
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

module.exports = (io) => {
  const onlineUsers = new Set();

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        onlineUsers.add(socket.userId.toString());
        socket.join(`user_${socket.userId}`);
        await User.findByIdAndUpdate(socket.userId, { onlineStatus: true });
        broadcastOnlineCount();
      } catch (err) {
        console.error("Socket Auth Error:", err.message);
      }
    }

    socket.on('join-queue', async ({ userId }) => {
      if (userId) {
        socket.userId = userId;
        onlineUsers.add(userId.toString());
        socket.join(`user_${userId}`);
        const dbUser = await User.findById(userId).select('onlineStatus blockedUsers');
        if (dbUser) {
          dbUser.onlineStatus = true;
          await dbUser.save();
          socket.blockedUsers = dbUser.blockedUsers.map(id => id.toString()) || [];
        }
        broadcastOnlineCount();
      }
      matchmaker.joinQueue(socket);
    });

    socket.on('leave-queue', () => {
      matchmaker.leaveQueue(socket.id);
    });

    socket.on('join-chat', ({ roomId }) => {
      socket.join(roomId);
    });

    socket.on('leave-chat', ({ roomId }) => {
      socket.leave(roomId);
    });

    socket.on('chat-message', async ({ message, roomId }) => {
      const timestamp = new Date().toISOString();
      
      socket.to(roomId).emit('chat-message', {
        sender: socket.id,
        text: message,
        timestamp
      });

      // PERSISTENCE & GLOBAL NOTIFICATION
      if (roomId.length === 24 && /^[0-9a-fA-F]+$/.test(roomId)) {
        try {
          if (socket.userId) {
            const newMessage = new Message({
              connectionId: roomId,
              sender: socket.userId,
              text: message,
              timestamp
            });
            await newMessage.save();

            // Find the other user to notify them globally
            const conn = await Connection.findById(roomId);
            if (conn && conn.users && socket.userId) {
              const myId = socket.userId.toString();
              const recipientId = conn.users.find(u => u && u.toString() !== myId);
              
              if (recipientId) {
                io.to(`user_${recipientId.toString()}`).emit('notification-update', { 
                  type: 'message', 
                  connectionId: roomId 
                });
              }
            }
          }
        } catch (err) {
          console.error("Failed to save/notify message:", err);
        }
      }
    });

    socket.on('action-skip', () => {
      matchmaker.skipMatch(socket.id, io);
    });

    socket.on('webrtc-offer', ({ offer, roomId }) => {
      socket.to(roomId).emit('webrtc-offer', { offer });
    });

    socket.on('webrtc-answer', ({ answer, roomId }) => {
      socket.to(roomId).emit('webrtc-answer', { answer });
    });

    socket.on('webrtc-ice-candidate', ({ candidate, roomId }) => {
      socket.to(roomId).emit('webrtc-ice-candidate', { candidate });
    });

    socket.on('typing', ({ roomId, username }) => {
      socket.to(roomId).emit('typing', { username });
    });

    socket.on('stop-typing', ({ roomId }) => {
      socket.to(roomId).emit('stop-typing');
    });

    socket.on('action-connect', async ({ roomId, userId }) => {
      socket.to(roomId).emit('peer-wants-connection');
      const users = await matchmaker.registerConnection(roomId, socket.id, userId, io);
      
      if (users && Array.isArray(users)) {
        users.forEach(uId => {
          if (uId) io.to(`user_${uId}`).emit('notification-update', { type: 'connection' });
        });
      }
    });

    socket.on('notification-update', (data) => {
      if (socket.userId) {
        io.to(`user_${socket.userId}`).emit('notification-update', data);
      }
    });

    socket.on('disconnect', async () => {
      matchmaker.leaveQueue(socket.id);
      matchmaker.skipMatch(socket.id, io);
      if (socket.userId) {
        const userIdStr = socket.userId.toString();
        const userSockets = await io.in(`user_${userIdStr}`).fetchSockets();
        if (userSockets.length === 0) {
          onlineUsers.delete(userIdStr);
          await User.findByIdAndUpdate(socket.userId, { onlineStatus: false });
          broadcastOnlineCount();
        }
      }
    });

    function broadcastOnlineCount() {
      const count = Math.max(onlineUsers.size - 1, 0);
      io.emit('online-count', { count });
    }
  });

  setInterval(() => {
    const count = Math.max(onlineUsers.size - 1, 0);
    io.emit('online-count', { count });
  }, 10000);
};
