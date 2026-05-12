// socket.js

const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('./config/jwt');

const matchmaker =
  require('./services/Matchmaker');

const User =
  require('./models/User');

const Message =
  require('./models/Message');

const Connection =
  require('./models/Connection');

const Notification =
  require('./models/Notification');

const {
  moderateText
} = require('./utils/moderation');

const {
  getUserCounts
} = require('./utils/stats');

const {
  attachMatchmakingProfile
} = require('./utils/socketMatchProfile');

const {
  emitConnectionUpdate,
  emitCountsUpdate,
  emitNotification
} = require('./utils/realtime');



// ======================================================
// FREE TIER OPTIMIZED SOCKET ARCHITECTURE
// ======================================================

module.exports = (io) => {

  // ======================================================
  // MEMORY PRESENCE
  // ======================================================

  const onlineUsers = new Set();

  const userSocketCounts =
    new Map();

  let lastOnlineCountEmit = 0;

  const ONLINE_EMIT_COOLDOWN = 5000;



  // ======================================================
  // PUSH USER COUNTS
  // ======================================================

  const pushUserStats =
    async (userId) => {

      try {

        const counts =
          await getUserCounts(
            userId,
            false
          );

        io.to(
          `user_${userId}`
        ).emit(
          'counts-update',
          counts
        );

      } catch (error) {

        console.error(
          '[PUSH USER STATS ERROR]:',
          error
        );
      }
    };



  // ======================================================
  // DELTA COUNTS
  // ======================================================

  const emitCountsDelta =
    (userId, delta) => {

      io.to(
        `user_${userId}`
      ).emit(
        'counts-delta',
        delta
      );
    };



  // ======================================================
  // NOTIFY FRIENDS ONLINE
  // ======================================================

  const notifyFriendsOnline =
    async (userId) => {

      try {

        const connections =
          await Connection.find(

            {
              users: userId,
              status: 'active'
            },

            'users'
          ).lean();

        const friendIds =
          connections
            .map((conn) =>
              conn.users.find(
                u =>
                  u.toString() !==
                  userId.toString()
              )
            )
            .filter(Boolean);

        const isOnline =
          onlineUsers.has(
            userId.toString()
          );

        friendIds.forEach(
          (friendId) => {

            io.to(
              `user_${friendId}`
            ).emit(
              'online-status-change',
              {
                userId,
                isOnline
              }
            );
          }
        );

      } catch (error) {

        console.error(
          '[ONLINE NOTIFY ERROR]:',
          error
        );
      }
    };



  // ======================================================
  // GLOBAL ONLINE COUNT
  // ======================================================

  const emitOnlineCount =
    () => {

      const now = Date.now();

      if (
        now - lastOnlineCountEmit <
        ONLINE_EMIT_COOLDOWN
      ) {

        return;
      }

      lastOnlineCountEmit = now;

      io.emit(
        'online-count',
        {
          count:
            onlineUsers.size
        }
      );
    };



  // ======================================================
  // SOCKET CONNECTION
  // ======================================================

  io.on(
    'connection',

    async (socket) => {

      try {

        let token =
          socket.handshake.auth
            ?.token;

        // ======================================================
        // COOKIE TOKEN
        // ======================================================

        if (
          !token &&
          socket.handshake.headers
            .cookie
        ) {

          const cookies =
            socket.handshake.headers.cookie
              .split(';')
              .reduce(
                (res, cookie) => {

                  const [
                    key,
                    value
                  ] = cookie
                    .trim()
                    .split('=')
                    .map(
                      decodeURIComponent
                    );

                  try {

                    return Object.assign(
                      res,
                      {
                        [key]:
                          JSON.parse(
                            value
                          )
                      }
                    );

                  } catch {

                    return Object.assign(
                      res,
                      {
                        [key]:
                          value
                      }
                    );
                  }

                },

                {}
              );

          token =
            cookies.token;
        }

        // ======================================================
        // NO TOKEN
        // ======================================================

        if (!token) {
          socket.disconnect(true);
          return;
        }

        // ======================================================
        // VERIFY JWT
        // ======================================================

        let decoded;
        try {
          decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
          if (err.name === 'TokenExpiredError') {
            console.warn('[SOCKET AUTH WARNING]: jwt expired for socket connection');
            socket.disconnect(true);
            return;
          }
          throw err;
        }

        socket.userId =
          decoded.id;

        // ======================================================
        // USER PROFILE
        // ======================================================

        const user =
          await attachMatchmakingProfile(
            socket
          );

        if (!user) {
          socket.disconnect(true);
          return;
        }

        socket.user =
          user;

        // ======================================================
        // USER ROOM
        // ======================================================

        socket.join(
          `user_${socket.userId}`
        );

        // ======================================================
        // TRACK SOCKETS
        // ======================================================

        const userIdStr =
          socket.userId.toString();

        const currentCount =
          userSocketCounts.get(
            userIdStr
          ) || 0;

        userSocketCounts.set(
          userIdStr,
          currentCount + 1
        );

        // ======================================================
        // ONLINE STATUS
        // ======================================================

        if (
          !onlineUsers.has(
            userIdStr
          )
        ) {

          onlineUsers.add(
            userIdStr
          );

          // MEMORY + LIGHT DB UPDATE
          User.updateOne(
            {
              _id:
                socket.userId
            },
            {
              $set: {
                onlineStatus:
                  'online',

                lastSeen:
                  new Date()
              }
            }
          ).catch(() => {});

          notifyFriendsOnline(
            userIdStr
          );

          emitOnlineCount();
        }

        // ======================================================
        // INITIAL COUNTS
        // ======================================================

        pushUserStats(
          userIdStr
        );

        // ======================================================
        // RECONNECT MATCHMAKER
        // ======================================================

        matchmaker.handleReconnect(
          socket,
          io
        );



        // ======================================================
        // JOIN CHAT ROOM
        // ======================================================

        socket.on(
          'join-room',

          (roomId) => {

            socket.join(roomId);
          }
        );



        // ======================================================
        // LEAVE ROOM
        // ======================================================

        socket.on(
          'leave-room',

          (roomId) => {

            socket.leave(roomId);
          }
        );



        // ======================================================
        // TYPING START
        // ======================================================

        socket.on(
          'typing',

          ({ roomId }) => {

            socket
              .to(roomId)
              .emit(
                'typing',
                {
                  userId:
                    socket.userId
                }
              );
          }
        );



        // ======================================================
        // TYPING STOP
        // ======================================================

        socket.on(
          'stop-typing',

          ({ roomId }) => {

            socket
              .to(roomId)
              .emit(
                'stop-typing',
                {
                  userId:
                    socket.userId
                }
              );
          }
        );



        // ======================================================
        // CHAT MESSAGE
        // ======================================================

        socket.on(

          'chat-message',

          async ({
            roomId,
            message,
            imageUrl
          }) => {

            try {

              // ======================================================
              // CONNECTION & MEMBERSHIP CHECK
              // ======================================================

              const connection =
                await Connection.findById(
                  roomId,
                  'users userDetails'
                ).lean();

              if (
                !connection ||
                !connection.users.some(
                  (u) =>
                    u.toString() ===
                    socket.userId.toString()
                )
              ) {
                return;
              }

              // Auto-join if not in room (failsafe)
              if (!socket.rooms.has(roomId)) {
                socket.join(roomId);
              }

              // ======================================================
              // VALIDATION
              // ======================================================

              if (
                (!message ||
                  !message.trim()) &&
                !imageUrl
              ) {

                return;
              }

              // ======================================================
              // MODERATION
              // ======================================================

              const moderation =
                moderateText(
                  message || ''
                );

              const finalMessage =
                moderation.text;

              const timestamp =
                new Date();

              // ======================================================
              // CREATE MESSAGE
              // ======================================================

              const createdMessage =
                await Message.create({

                  connectionId:
                    roomId,

                  sender:
                    socket.userId,

                  senderInfo: {

                    _id:
                      socket.user._id,

                    username:
                      socket.user
                        .username,

                    profilePic:
                      socket.user
                        .profilePic
                  },

                  text:
                    finalMessage,

                  imageUrl:
                    imageUrl ||
                    null
                });

              console.log(`[DEBUG] Saved message ${createdMessage._id} to connection ${roomId}`);

              // ======================================================
              // UPDATE CONNECTION
              // ======================================================

              Connection.updateOne(
                {
                  _id: roomId
                },
                {
                  $set: {

                    lastMessage: {

                      text:
                        finalMessage ||
                        '📷 Image',

                      createdAt:
                        timestamp
                    },

                    updatedAt:
                      timestamp
                  }
                }
              ).catch(() => {});

              // ======================================================
              // RECIPIENT
              // ======================================================

              const recipientId =
                connection.users.find(
                  (u) =>
                    u.toString() !==
                    socket.userId.toString()
                );

              // ======================================================
              // REALTIME MESSAGE
              // ======================================================

              const payload = {
                id: createdMessage._id,
                roomId,
                sender: socket.userId,
                senderInfo: createdMessage.senderInfo,
                text: finalMessage,
                imageUrl: imageUrl || null,
                createdAt: timestamp
              };

              // Send to both user rooms so chat panels and inbox previews stay
              // synced without a manual refresh.
              io.to(`user_${socket.userId}`).emit('chat-message', payload);
              if (recipientId) {
                io.to(`user_${recipientId}`).emit('chat-message', payload);
              }

              // ======================================================
              // NOTIFICATION
              // ======================================================

              if (
                recipientId
              ) {

                const notification = await Notification.create({

                  user:
                    recipientId,

                  type:
                    'message',

                  content:
                    finalMessage
                      ?.substring(
                        0,
                        80
                      ) ||
                    '📷 Image',

                  fromUser: {

                    _id:
                      socket.user
                        ._id,

                    username:
                      socket.user
                        .username,

                    profilePic:
                      socket.user
                        .profilePic
                  },

                  relatedId:
                    roomId
                });

                // DELTA COUNTS
                emitCountsDelta(

                  recipientId.toString(),

                  {

                    messages: 1,

                    notifications: 1,

                    perChat: {
                      [roomId]: 1
                    }
                  }
                );

                // REALTIME NOTIFICATION
                io.to(
                  `user_${recipientId}`
                ).emit(

                  'new-notification',

                  {
                    _id:
                      notification._id,

                    type:
                      notification.type,

                    content:
                      notification.content,

                    relatedId:
                      roomId,

                    roomId,

                    isRead:
                      false,

                    createdAt:
                      notification.createdAt,

                    legacyContent:
                      finalMessage
                        ?.substring(
                          0,
                          80
                        ) ||
                      '📷 Image',

                    roomId,

                    fromUser: {

                      _id:
                        socket.user
                          ._id,

                      username:
                        socket.user
                          .username,

                      profilePic:
                        socket.user
                          .profilePic
                    }
                  }
                );

                // 🔥 Update unread badge counts
              }

            } catch (error) {

              console.error(
                '[CHAT MESSAGE ERROR]:',
                error
              );
            }
          }
        );



        // ======================================================
        // MATCHMAKING QUEUE
        // ======================================================

        socket.on(
          'join-queue',

          () => {

            matchmaker.joinQueue(
              socket
            );
          }
        );

        socket.on(
          'leave-queue',

          () => {

            matchmaker.leaveQueue(
              socket.id
            );
          }
        );



        // ======================================================
        // SKIP MATCH
        // ======================================================

        socket.on(
          'skip-match',

          () => {

            matchmaker.skipMatch(
              socket.id,
              io
            );
          }
        );



        // ======================================================
        // WEBRTC SIGNALING
        // ======================================================

        socket.on(
          'webrtc-offer',

          ({
            roomId,
            offer
          }) => {

            socket
              .to(roomId)
              .emit(
                'webrtc-offer',
                {
                  offer
                }
              );
          }
        );

        socket.on(
          'webrtc-answer',

          ({
            roomId,
            answer
          }) => {

            socket
              .to(roomId)
              .emit(
                'webrtc-answer',
                {
                  answer
                }
              );
          }
        );

        socket.on(
          'webrtc-ice-candidate',

          ({
            roomId,
            candidate
          }) => {

            socket
              .to(roomId)
              .emit(
                'webrtc-ice-candidate',
                {
                  candidate
                }
              );
          }
        );



        // ======================================================
        // MESSAGE READ
        // ======================================================

        socket.on(

          'messages-read',

          async (payload = {}) => {

            try {
              const roomId =
                payload.roomId ||
                payload.connectionId;

              if (!roomId) return;

              await Message.updateMany(

                {

                  connectionId:
                    roomId,

                  sender: {
                    $ne:
                      socket.userId
                  },

                  isRead: false
                },

                {

                  $set: {

                    isRead: true,

                    readAt:
                      new Date()
                  }
                }
              );

              const connection =
                await Connection.findById(
                  roomId,
                  'users'
                ).lean();

              const readPayload = {
                roomId,
                connectionId: roomId,
                userId: socket.userId,
                readBy: socket.userId
              };

              if (connection?.users?.length) {
                connection.users.forEach((userId) => {
                  io.to(`user_${userId}`).emit('messages-read', readPayload);
                });
              } else {
                socket.to(roomId).emit('messages-read', readPayload);
              }

            } catch (error) {

              console.error(
                '[READ ERROR]:',
                error
              );
            }
          }
        );



        // ======================================================
        // IN-CALL ACTIONS (Doc Section 17.2)
        // ======================================================

        socket.on('action-connect', async ({ roomId, userId }) => {
          try {
            if (!roomId || !socket.userId) return;

            // 1. Get match info
            const match = matchmaker.activeMatches.get(roomId);
            if (!match) return;

            // 2. Find target user
            const targetUserId = match.user1Id.toString() === socket.userId.toString()
              ? match.user2Id
              : match.user1Id;

            if (!targetUserId) return;

            // 3. Emit real-time popup to the peer
            socket.to(roomId).emit('peer-wants-connection');

            // 4. Persistence
            const Like = require('./models/Like');
            
            // Check if already liked (mutual)
            const existingLike = await Like.findOne({
              fromUser: targetUserId,
              toUser: socket.userId
            });

            if (existingLike) {
              // It's a mutual match! Create the formal connection.
              const Connection = require('./models/Connection');
              const User = require('./models/User');

              const sortedIds = [socket.userId.toString(), targetUserId.toString()].sort();
              const pairKey = sortedIds.join('_');

              const existingConn = await Connection.findOne({ pairKey });

              if (!existingConn) {
                const targetUserFull = await User.findById(targetUserId).select('username profilePic onlineStatus').lean();
                const currentUserFull = await User.findById(socket.userId).select('username profilePic onlineStatus').lean();

                if (targetUserFull && currentUserFull) {
                  const newConn = await Connection.create({
                    users: [socket.userId, targetUserId],
                    pairKey,
                    userDetails: [
                      {
                        _id: currentUserFull._id,
                        username: currentUserFull.username,
                        profilePic: currentUserFull.profilePic,
                        onlineStatus: currentUserFull.onlineStatus
                      },
                      {
                        _id: targetUserFull._id,
                        username: targetUserFull.username,
                        profilePic: targetUserFull.profilePic,
                        onlineStatus: targetUserFull.onlineStatus
                      }
                    ]
                  });

                  // Cleanup likes
                  await Like.deleteMany({
                    $or: [
                      { fromUser: socket.userId, toUser: targetUserId },
                      { fromUser: targetUserId, toUser: socket.userId }
                    ]
                  });

                  // 🔥 Create persistent Notification in DB
                  const Notification = require('./models/Notification');
                  const notifications = await Notification.create([
                    {
                      user: targetUserId,
                      type: 'match',
                      content: `You matched with ${currentUserFull.username}!`,
                      fromUser: {
                        _id: currentUserFull._id,
                        username: currentUserFull.username,
                        profilePic: currentUserFull.profilePic
                      },
                      relatedId: newConn._id
                    },
                    {
                      user: socket.userId,
                      type: 'match',
                      content: `You matched with ${targetUserFull.username}!`,
                      fromUser: {
                        _id: targetUserFull._id,
                        username: targetUserFull.username,
                        profilePic: targetUserFull.profilePic
                      },
                      relatedId: newConn._id
                    }
                  ]);

                  // Notify both clients of the new active connection
                  io.to(roomId).emit('connection-established');
                  emitConnectionUpdate(io, newConn, 'new-connection');
                  emitCountsUpdate(io, targetUserId);
                  emitCountsUpdate(io, socket.userId);
                  
                  emitNotification(io, targetUserId, notifications[0]);
                  emitNotification(io, socket.userId, notifications[1]);
                  return; // Stop here, no need to create another Like
                }
              }
            }

            // If not mutual yet, create/update the like record
            await Like.findOneAndUpdate(
              { fromUser: socket.userId, toUser: targetUserId },
              { isRead: false },
              { upsert: true, new: true }
            );

          } catch (error) {
            console.error('[ACTION-CONNECT ERROR]:', error);
          }
        });

        socket.on('action-skip', () => {
          try {
            matchmaker.skipMatch(socket.id, io, 'skipped');
          } catch (error) {
            console.error('[ACTION-SKIP ERROR]:', error);
          }
        });

        // ======================================================
        // DISCONNECT
        // ======================================================

        socket.on(
          'disconnect',

          async () => {

            try {

              if (
                !socket.userId
              ) {
                return;
              }

              const userIdStr =
                socket.userId.toString();

              const currentCount =
                userSocketCounts.get(
                  userIdStr
                ) || 0;

              // ======================================================
              // DECREASE SOCKET COUNT
              // ======================================================

              if (
                currentCount <= 1
              ) {

                userSocketCounts.delete(
                  userIdStr
                );

                onlineUsers.delete(
                  userIdStr
                );

                // LIGHT DB UPDATE
                User.updateOne(
                  {
                    _id:
                      socket.userId
                  },
                  {
                    $set: {

                      onlineStatus:
                        'offline',

                      lastSeen:
                        new Date()
                    }
                  }
                ).catch(() => {});

                notifyFriendsOnline(
                  userIdStr
                );

                emitOnlineCount();

              } else {

                userSocketCounts.set(
                  userIdStr,
                  currentCount - 1
                );
              }

              // ======================================================
              // MATCHMAKER
              // ======================================================

              matchmaker.handleDisconnect(
                socket,
                io
              );

            } catch (error) {

              console.error(
                '[DISCONNECT ERROR]:',
                error
              );
            }
          }
        );

      } catch (error) {

        console.error(
          '[SOCKET CONNECTION ERROR]:',
          error
        );
      }
    }
  );
};
