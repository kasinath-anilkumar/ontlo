const matchmaker = require('./services/Matchmaker');
const User = require('./models/User');
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const jwt = require('jsonwebtoken');
const { moderateText } = require('./utils/moderation');
const AppConfig = require('./models/AppConfig');
const Notification = require('./models/Notification');
const { JWT_SECRET } = require('./config/jwt');

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
    let token = socket.handshake.auth?.token;
    
    // Parse cookies manually if token is not in auth
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
        
        // Fetch essential user data for the matchmaker once on connection
        const user = await User.findById(socket.userId).select('age isPremium lastBoostedAt onlineStatus blockedUsers role interests location region matchPreferences gender isShadowBanned');
        if (user) {
          socket.age = user.age;
          socket.isPremium = user.isPremium;
          socket.lastBoostedAt = user.lastBoostedAt;
          socket.interests = user.interests || [];
          socket.location = user.location;
          socket.region = user.region || 'Global';
          socket.role = user.role;
          socket.gender = user.gender;
          socket.blockedUsers = user.blockedUsers.map(id => id.toString());
          socket.isShadowBanned = user.isShadowBanned || false;
          socket.matchPreferences = user.matchPreferences || {
            gender: 'All',
            ageRange: { min: 18, max: 100 },
            region: 'Global'
          };
          
          if (user.role === 'user') {
            onlineUsers.add(socket.userId.toString());
            broadcastOnlineCount();
          }

          socket.join(`user_${socket.userId}`);
          await User.findByIdAndUpdate(socket.userId, { onlineStatus: true });

          // CHECK FOR RECONNECTION TO ACTIVE MATCH
          matchmaker.handleReconnect(socket, io);
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

    socket.on('join-chat', async ({ roomId }) => {
      if (!socket.userId) return;
      try {
        // 1. Try to see if it's a persistent connection ID (MongoDB ID)
        if (roomId.length === 24 && /^[0-9a-fA-F]+$/.test(roomId)) {
          const conn = await Connection.findById(roomId);
          if (conn && conn.users && conn.users.some(u => u.toString() === socket.userId.toString())) {
            socket.join(roomId);
            return;
          }
        }

        // 2. Fallback: Check if it's an active match room from the matchmaker
        const matchRoomId = matchmaker.getUserMatch(socket.id);
        if (matchRoomId === roomId) {
          socket.join(roomId);
        }
      } catch (err) {
        console.error('Error joining chat:', err);
      }
    });

    socket.on('leave-chat', ({ roomId }) => {
      socket.leave(roomId);
    });

    socket.on('typing', ({ roomId, username }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('typing', { username });
    });

    socket.on('stop-typing', ({ roomId }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('stop-typing');
    });

    socket.on('messages-read', ({ connectionId }) => {
      if (!socket.rooms.has(connectionId)) return;
      socket.to(connectionId).emit('messages-read', { connectionId });
    });

    socket.on('update-match-preferences', (newPrefs) => {
      socket.matchPreferences = newPrefs;
    });

    socket.on('toggle-privacy', ({ roomId, isPrivate }) => {
      socket.to(roomId).emit('peer-privacy', { isPrivate });
    });

    socket.on('chat-message', async ({ message, imageUrl, roomId }) => {
      // In video chat, roomId is a UUID. In persistent chat, it's a Connection ID.
      // We allow the message if the user is currently in that room.
      if (!socket.rooms.has(roomId)) {
        // One last check: maybe they are in the match but the room state is slightly out of sync
        const matchRoomId = matchmaker.getUserMatch(socket.id);
        if (matchRoomId === roomId) {
          socket.join(roomId);
        } else {
          return;
        }
      }

      const timestamp = new Date().toISOString();
      const moderation = moderateText(message);
      const finalMessage = moderation.text;

      let imageModerated = { clean: true };
      if (imageUrl) {
        imageModerated = await require('./utils/moderation').moderateImage(imageUrl);
      }

      const isFlagged = !moderation.clean || !imageModerated.clean;

      socket.to(roomId).emit('chat-message', {
        sender: socket.id,
        text: finalMessage,
        imageUrl,
        isFlagged,
        moderationScore: moderation.score,
        timestamp
      });

      if (roomId.length === 24 && /^[0-9a-fA-F]+$/.test(roomId)) {
        try {
          if (socket.userId) {
            const conn = await Connection.findById(roomId);
            
            // SECURITY: Verify user belongs to this connection
            if (conn && conn.users && conn.users.some(u => u.toString() === socket.userId.toString())) {
              const newMessage = new Message({
                connectionId: roomId,
                sender: socket.userId,
                text: finalMessage,
                imageUrl,
                isFlagged,
                moderationScore: moderation.score,
                timestamp
              });
              await newMessage.save();

              // AUTO-REPORT if very toxic
              if (moderation.score > 0.8) {
                const Report = require('./models/Report');
                const autoReport = new Report({
                  reporter: socket.userId, // Or a system user ID
                  reportedUser: conn.users.find(u => u && u.toString() !== socket.userId.toString()),
                  reason: `Auto-flagged: High toxicity score (${moderation.score}). Flags: ${moderation.flags.join(', ')}`,
                  severity: 'high',
                  status: 'pending',
                  aiConfidence: moderation.score * 100,
                  aiSummary: `Auto-moderator detected toxic content: "${message}"`
                });
                await autoReport.save();
              }

              const recipientId = conn.users.find(u => u && u.toString() !== socket.userId.toString());
              if (recipientId) {
                // Fire and forget: Create persistent notification for message
                Notification.create({
                  user: recipientId,
                  type: 'message',
                  content: finalMessage.length > 50 ? finalMessage.substring(0, 50) + '...' : finalMessage,
                  fromUser: socket.userId,
                  relatedId: roomId
                }).catch(e => console.error("Notification error:", e));

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

    socket.on('action-skip', async () => {
      await matchmaker.skipMatch(socket.id, io);
    });

    socket.on('webrtc-offer', ({ offer, roomId }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('webrtc-offer', { offer });
    });

    socket.on('webrtc-answer', ({ answer, roomId }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('webrtc-answer', { answer });
    });

    socket.on('webrtc-ice-candidate', ({ candidate, roomId }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('webrtc-ice-candidate', { candidate });
    });

    socket.on('action-connect', async ({ roomId }) => {
      if (!socket.userId) return;
      socket.to(roomId).emit('peer-wants-connection');
      const users = await matchmaker.registerConnection(roomId, socket.id, socket.userId, io);
      if (users) {
        users.forEach(async (uId) => {
          // Create persistent notification for new connection/match
          const otherUserId = users.find(id => id.toString() !== uId.toString());
          if (otherUserId) {
            Notification.create({
              user: uId,
              type: 'match',
              content: "You've got a new connection! ✨",
              fromUser: otherUserId,
              relatedId: roomId
            }).catch(e => console.error("Match notification error:", e));
          }

          io.to(`user_${uId}`).emit('notification-update', { type: 'connection' });
        });
      }
    });

    function broadcastOnlineCount() {
      const count = Math.max(onlineUsers.size - 1, 0);
      io.emit('online-count', { count });
    }

    socket.on('disconnect', async () => {
      matchmaker.handleDisconnect(socket, io);
      if (socket.userId) {
        const userIdStr = socket.userId.toString();
        const userSockets = await io.in(`user_${userIdStr}`).fetchSockets();
        if (userSockets.length === 0) {
          onlineUsers.delete(userIdStr);
          await User.findByIdAndUpdate(socket.userId, { onlineStatus: false });
          broadcastOnlineCountThrottled(io, onlineUsers);
        }
      }
    });
  });

  // Optimized broadcast: only once per 5 seconds max (Global)
  let lastBroadcast = 0;
  function broadcastOnlineCountThrottled(io, onlineUsers) {
    const now = Date.now();
    if (now - lastBroadcast > 5000) {
      const count = Math.max(onlineUsers.size - 1, 0);
      io.emit('online-count', { count });
      lastBroadcast = now;
    }
  }
};
