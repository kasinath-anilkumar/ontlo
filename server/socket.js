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
const { attachMatchmakingProfile } = require('./utils/socketMatchProfile');

module.exports = (io) => {
  const onlineUsers = new Set();
  let lastOnlineCountEmit = 0;
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
      const connections = await Connection.find({ users: userId, status: 'active' })
        .select('users')
        .lean();
      const friendIds = [
        ...new Set(
          connections
            .map((conn) => {
              const fid = conn.users.find((u) => u.toString() !== userId.toString());
              return fid ? fid.toString() : null;
            })
            .filter(Boolean)
        )
      ];
      // Run in parallel — sequential awaits were N round-trips and felt very slow on free tier.
      await Promise.all(friendIds.map((fid) => pushOnlineFriends(fid)));
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

        const user = await attachMatchmakingProfile(socket);
        if (user) {
          socket.join(`user_${socket.userId}`);

          if (user.role === 'user') {
            onlineUsers.add(socket.userId.toString());
            await User.findByIdAndUpdate(socket.userId, { onlineStatus: true });

            pushUserStats(socket.userId);
            pushOnlineFriends(socket.userId);
            notifyFriendsOfStatus(socket.userId);

            const now = Date.now();
            if (now - lastOnlineCountEmit > 5000) {
              lastOnlineCountEmit = now;
              io.emit('online-count', { count: onlineUsers.size });
            }
          }

          matchmaker.handleReconnect(socket, io);
        }
      } catch (err) {
        console.error("Socket Auth Error:", err.message);
      }
    }

    socket.on('join-queue', async () => {
      if (!socket.userId) {
        return socket.emit('error', { message: 'Not authenticated.' });
      }
      await attachMatchmakingProfile(socket);
      if (
        maintenanceMode &&
        !['admin', 'superadmin', 'moderator'].includes(socket.role)
      ) {
        return socket.emit('error', { message: 'System is under maintenance.' });
      }
      matchmaker.joinQueue(socket);
    });

    socket.on('leave-queue', () => {
      matchmaker.leaveQueue(socket.id);
    });

    // WebRTC signaling relay (required for offer/answer/ICE to reach the peer)
    const relayIfInRoom = (roomId, event, payload) => {
      const match = matchmaker.activeMatches.get(roomId);
      if (!match) {
        console.warn(`[Signaling] Blocked ${event} - Room ${roomId} not found in active matches.`);
        return;
      }
      
      // Find the other socket ID in the match
      const otherSocketId = match.user1 === socket.id ? match.user2 : match.user1;
      if (otherSocketId) {
        io.to(otherSocketId).emit(event, payload);
      } else {
        console.warn(`[Signaling] Could not find peer for ${socket.id} in room ${roomId}`);
      }
    };

    socket.on('webrtc-offer', ({ offer, roomId }) => {
      if (!offer) return;
      relayIfInRoom(roomId, 'webrtc-offer', { offer });
    });

    socket.on('webrtc-answer', ({ answer, roomId }) => {
      if (!answer) return;
      relayIfInRoom(roomId, 'webrtc-answer', { answer });
    });

    socket.on('webrtc-ice-candidate', ({ candidate, roomId }) => {
      if (!candidate) return;
      relayIfInRoom(roomId, 'webrtc-ice-candidate', { candidate });
    });

    socket.on('action-skip', () => {
      matchmaker.skipMatch(socket.id, io, 'skipped', socket.userId);
    });

    socket.on('join-chat', ({ roomId }) => {
      if (!roomId || typeof roomId !== 'string') return;
      socket.join(roomId);
    });

    socket.on('leave-chat', ({ roomId }) => {
      if (!roomId || typeof roomId !== 'string') return;
      socket.leave(roomId);
    });

    socket.on('typing', ({ roomId, username }) => {
      relayIfInRoom(roomId, 'typing', { username });
    });

    socket.on('stop-typing', ({ roomId }) => {
      relayIfInRoom(roomId, 'stop-typing', {});
    });

    socket.on('messages-read', ({ connectionId }) => {
      if (!connectionId) return;
      relayIfInRoom(connectionId, 'messages-read', { connectionId });
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
          const conn = await Connection.findById(roomId).select('users').lean();
          if (conn && conn.users.some((u) => u.toString() === socket.userId.toString())) {
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
              const notifPayload =
                typeof notification.toObject === 'function'
                  ? notification.toObject()
                  : { ...notification };
              io.to(`user_${recipientId}`).emit('new-notification', {
                ...notifPayload,
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
      
      const match = matchmaker.activeMatches.get(roomId);
      if (match) {
        const otherSocketId = match.user1 === socket.id ? match.user2 : match.user1;
        if (otherSocketId) io.to(otherSocketId).emit('peer-wants-connection');
      }
      
      const users = await matchmaker.registerConnection(roomId, socket.id, socket.userId, io);
      if (users) {
        for (const uId of users) {
          const otherUserId = users.find(id => id.toString() !== uId.toString());
          
          // Notify the frontend to refresh lists (Dashboard/Connections)
          io.to(`user_${uId}`).emit('new-match', { 
            roomId, 
            otherUserId 
          });

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

          notifyFriendsOfStatus(socket.userId);

          const now = Date.now();
          if (now - lastOnlineCountEmit > 5000) {
            lastOnlineCountEmit = now;
            io.emit('online-count', { count: onlineUsers.size });
          }
        }
      }
    });
  });
};
