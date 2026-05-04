const matchmaker = require('./services/Matchmaker');
const User = require('./models/User');
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const jwt = require('jsonwebtoken');
const { moderateText } = require('./utils/moderation');
const AppConfig = require('./models/AppConfig');
const Notification = require('./models/Notification');
const { JWT_SECRET } = require('./config/jwt');
const { getUserCounts, getOnlineConnections } = require('./utils/stats');

module.exports = (io) => {
  const onlineUsers = new Set();
  let maintenanceMode = false;

  const checkMaintenance = async () => {
    try {
      const config = await AppConfig.findOne();
      maintenanceMode = config?.maintenanceMode || false;
    } catch (err) {
      maintenanceMode = false;
    }
  };
  setInterval(checkMaintenance, 30000);
  checkMaintenance();

  // Utility to update a specific user's frontend state
  const pushUserStats = async (userId) => {
    const counts = await getUserCounts(userId, true);
    io.to(`user_${userId}`).emit('counts-update', counts);
  };

  const pushOnlineFriends = async (userId) => {
    const online = await getOnlineConnections(userId, true);
    io.to(`user_${userId}`).emit('online-users-update', online);
  };

  // When someone connects/disconnects, we need to update all their friends
  const notifyFriendsOfStatus = async (userId) => {
    try {
      const connections = await Connection.find({ users: userId });
      for (const conn of connections) {
        const friendId = conn.users.find(u => u.toString() !== userId.toString());
        if (friendId) {
          pushOnlineFriends(friendId.toString());
        }
      }
    } catch (err) {
      console.error('Error notifying friends of status:', err);
    }
  };

  io.on('connection', async (socket) => {
    let token = socket.handshake.auth?.token;
    
    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';').reduce((res, c) => {
        const [key, val] = c.trim().split('=').map(decodeURIComponent);
        try {
          return Object.assign(res, { [key]: JSON.parse(val) });
        } catch (e) {
          return Object.assign(res, { [key]: val });
        }
      }, {});
      token = cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        
        const user = await User.findById(socket.userId).select('age onlineStatus blockedUsers role interests location matchPreferences gender');
        if (user) {
          socket.join(`user_${socket.userId}`);
          
          if (user.role === 'user') {
            onlineUsers.add(socket.userId.toString());
            await User.findByIdAndUpdate(socket.userId, { onlineStatus: true });
            
            // Push initial data to the connecting user
            pushUserStats(socket.userId);
            pushOnlineFriends(socket.userId);
            
            // Notify friends that this user is now online
            notifyFriendsOfStatus(socket.userId);
          }

          matchmaker.handleReconnect(socket, io);
        }
      } catch (err) {
        console.error("Socket Auth Error:", err.message);
      }
    }

    socket.on('join-queue', async () => {
      if (maintenanceMode && socket.role !== 'admin' && socket.role !== 'superadmin') {
        return socket.emit('error', { message: 'System is under maintenance.' });
      }
      matchmaker.joinQueue(socket);
    });

    socket.on('leave-queue', () => {
      matchmaker.leaveQueue(socket.id);
    });

    socket.on('chat-message', async ({ message, imageUrl, roomId }) => {
      if (!socket.rooms.has(roomId)) return;

      const timestamp = new Date().toISOString();
      const moderation = moderateText(message);
      const finalMessage = moderation.text;

      socket.to(roomId).emit('chat-message', {
        sender: socket.id,
        text: finalMessage,
        imageUrl,
        timestamp
      });

      // Persistent Storage
      if (roomId.length === 24) {
        try {
          const conn = await Connection.findById(roomId);
          if (conn && conn.users.some(u => u.toString() === socket.userId.toString())) {
            const newMessage = new Message({
              connectionId: roomId,
              sender: socket.userId,
              text: finalMessage,
              imageUrl,
              timestamp
            });
            await newMessage.save();

            const recipientId = conn.users.find(u => u && u.toString() !== socket.userId.toString());
            if (recipientId) {
              const notification = await Notification.create({
                user: recipientId,
                type: 'message',
                content: finalMessage.substring(0, 50),
                fromUser: socket.userId,
                relatedId: roomId
              });

              // Push the rich notification with sender profile
              const sender = await User.findById(socket.userId).select('username profilePic');
              io.to(`user_${recipientId}`).emit('new-notification', {
                ...notification._doc,
                fromUser: sender
              });
              
              // Also update their badge counts
              pushUserStats(recipientId.toString());
            }
          }
        } catch (err) {
          console.error("Message persistence error:", err);
        }
      }
    });

    socket.on('action-connect', async ({ roomId }) => {
      if (!socket.userId) return;
      socket.to(roomId).emit('peer-wants-connection');
      const users = await matchmaker.registerConnection(roomId, socket.id, socket.userId, io);
      if (users) {
        for (const uId of users) {
          const otherUserId = users.find(id => id.toString() !== uId.toString());
          await Notification.create({
            user: uId,
            type: 'match',
            content: "New connection! ✨",
            fromUser: otherUserId,
            relatedId: roomId
          });
          pushUserStats(uId.toString());
        }
      }
    });

    socket.on('disconnect', async () => {
      matchmaker.handleDisconnect(socket, io);
      if (socket.userId) {
        const userIdStr = socket.userId.toString();
        const userSockets = await io.in(`user_${userIdStr}`).fetchSockets();
        if (userSockets.length === 0) {
          onlineUsers.delete(userIdStr);
          await User.findByIdAndUpdate(socket.userId, { onlineStatus: false });
          
          // Notify friends that this user is now offline
          notifyFriendsOfStatus(socket.userId);
        }
      }
    });
  });
};
