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
          return;
        }

        // ======================================================
        // VERIFY JWT
        // ======================================================

        const decoded =
          jwt.verify(
            token,
            JWT_SECRET
          );

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
          'typing-start',

          ({ roomId }) => {

            socket
              .to(roomId)
              .emit(
                'typing-start',
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
          'typing-stop',

          ({ roomId }) => {

            socket
              .to(roomId)
              .emit(
                'typing-stop',
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
              // ROOM CHECK
              // ======================================================

              if (
                !socket.rooms.has(
                  roomId
                )
              ) {
                return;
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
              // CONNECTION
              // ======================================================

              const connection =
                await Connection.findById(

                  roomId,

                  `
                  users
                  userDetails
                  `
                ).lean();

              if (!connection) {
                return;
              }

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

              io.to(roomId).emit(
                'chat-message',

                {

                  id:
                    createdMessage._id,

                  roomId,

                  sender:
                    socket.userId,

                  senderInfo:
                    createdMessage.senderInfo,

                  text:
                    finalMessage,

                  imageUrl:
                    imageUrl ||
                    null,

                  createdAt:
                    timestamp
                }
              );

              // ======================================================
              // NOTIFICATION
              // ======================================================

              if (
                recipientId
              ) {

                Notification.create({

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
                }).catch(() => {});

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

                    type:
                      'message',

                    content:
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

          async ({
            roomId
          }) => {

            try {

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

              socket
                .to(roomId)
                .emit(
                  'messages-read',
                  {
                    roomId,
                    userId:
                      socket.userId
                  }
                );

            } catch (error) {

              console.error(
                '[READ ERROR]:',
                error
              );
            }
          }
        );



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