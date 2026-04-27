const matchmaker = require('./services/Matchmaker');
const User = require('./models/User');
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const jwt = require('jsonwebtoken');
const { moderateText } = require('./utils/moderation');
const AppConfig = require('./models/AppConfig');
const Notification = require('./models/Notification');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

module.exports = (io) => {
  const onlineUsers = new Set();
  let maintenanceMode = false;

  // PERIODIC MAINTENANCE CHECK
  const checkMaintenance = async () => {
    try {
      const config = await AppConfig.findOne();
      maintenanceMode = config?.maintenanceMode || false;
    } catch (err) {
      maintenanceMode = false;
    }
  };
  setInterval(checkMaintenance, 30000); // Check every 30s
  checkMaintenance();

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        
        // Fetch essential user data for the matchmaker once on connection
        const user = await User.findById(socket.userId).select('age isPremium onlineStatus blockedUsers role');
        if (user) {
          socket.age = user.age;
          socket.isPremium = user.isPremium;
          socket.role = user.role;
          socket.blockedUsers = user.blockedUsers.map(id => id.toString());
          
          if (user.role === 'user') {
            onlineUsers.add(socket.userId.toString());
            broadcastOnlineCount();
          }

          socket.join(`user_${socket.userId}`);
          await User.findByIdAndUpdate(socket.userId, { onlineStatus: true });
        }
      } catch (err) {
        console.error("Socket Auth Error:", err.message);
      }
    }

    // MIDDLEWARE: Block events if maintenance is ON
    socket.use(([event, ...args], next) => {
      if (maintenanceMode && !['admin_action', 'notification-update'].includes(event)) {
        if (socket.role !== 'admin' && socket.role !== 'superadmin') {
           return next(new Error('System under maintenance'));
        }
      }
      next();
    });

    socket.on('join-queue', async ({ userId }) => {
      if (maintenanceMode && socket.role !== 'admin' && socket.role !== 'superadmin') {
        return socket.emit('error', { message: 'System is under maintenance.' });
      }

      if (socket.role === 'admin' || socket.role === 'superadmin') {
        return socket.emit('error', { message: 'Admins cannot join matchmaking.' });
      }
      
      matchmaker.joinQueue(socket);
    });

    socket.on('leave-queue', () => {
      matchmaker.leaveQueue(socket.id);
    });

    socket.on('join-chat', ({ roomId }) => {
      socket.join(roomId);
    });

    socket.on('chat-message', async ({ message, imageUrl, roomId }) => {
      const timestamp = new Date().toISOString();
      const moderation = moderateText(message);
      const finalMessage = moderation.text;

      socket.to(roomId).emit('chat-message', {
        sender: socket.id,
        text: finalMessage,
        imageUrl,
        isFlagged: !moderation.clean,
        timestamp
      });

      if (roomId.length === 24 && /^[0-9a-fA-F]+$/.test(roomId)) {
        try {
          if (socket.userId) {
            const newMessage = new Message({
              connectionId: roomId,
              sender: socket.userId,
              text: finalMessage,
              imageUrl,
              timestamp
            });
            await newMessage.save();

            const conn = await Connection.findById(roomId);
            if (conn && conn.users) {
              const recipientId = conn.users.find(u => u && u.toString() !== socket.userId.toString());
              if (recipientId) {
                // Create persistent notification for message
                await Notification.create({
                  user: recipientId,
                  type: 'message',
                  content: finalMessage.length > 50 ? finalMessage.substring(0, 50) + '...' : finalMessage,
                  fromUser: socket.userId,
                  relatedId: roomId
                });

                io.to(`user_${recipientId.toString()}`).emit('notification-update', { 
                  type: 'message', 
                  connectionId: roomId 
                });
              }
            }
          }
        } catch (err) {
          console.error("Message error:", err);
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

    socket.on('action-connect', async ({ roomId, userId }) => {
      socket.to(roomId).emit('peer-wants-connection');
      const users = await matchmaker.registerConnection(roomId, socket.id, userId, io);
      if (users) {
        users.forEach(async (uId) => {
          // Create persistent notification for new connection/match
          const otherUserId = users.find(id => id.toString() !== uId.toString());
          if (otherUserId) {
            await Notification.create({
              user: uId,
              type: 'match',
              content: "You've got a new connection! ✨",
              fromUser: otherUserId,
              relatedId: roomId
            });
          }

          io.to(`user_${uId}`).emit('notification-update', { type: 'connection' });
        });
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
          broadcastOnlineCountThrottled();
        }
      }
    });

    function broadcastOnlineCount() {
      const count = Math.max(onlineUsers.size - 1, 0);
      io.emit('online-count', { count });
    }

    // Optimized broadcast: only once per 5 seconds max
    let lastBroadcast = 0;
    function broadcastOnlineCountThrottled() {
      const now = Date.now();
      if (now - lastBroadcast > 5000) {
        broadcastOnlineCount();
        lastBroadcast = now;
      }
    }
  });
};
