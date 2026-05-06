const mongoose = require('mongoose');

const Message =
  require('../models/Message');

const Notification =
  require('../models/Notification');

const Connection =
  require('../models/Connection');

const Like =
  require('../models/Like');



// ======================================================
// CACHE
// ======================================================

const countCache = new Map();

const onlineCache = new Map();

const pendingCounts = new Map();

const pendingOnline = new Map();

const CACHE_TTL = 15000;



// ======================================================
// CLEAN CACHE
// ======================================================

setInterval(() => {

  const now = Date.now();

  // ======================================================
  // COUNT CACHE
  // ======================================================

  for (const [key, value] of countCache) {

    if (
      now - value.timestamp >
      CACHE_TTL
    ) {

      countCache.delete(key);
    }
  }

  // ======================================================
  // ONLINE CACHE
  // ======================================================

  for (const [key, value] of onlineCache) {

    if (
      now - value.timestamp >
      CACHE_TTL
    ) {

      onlineCache.delete(key);
    }
  }

}, 60000);



// ======================================================
// GET USER COUNTS
// ======================================================

const getUserCounts = async (
  userId,
  forceRefresh = false
) => {

  try {

    if (!userId) {

      return {

        messages: 0,
        notifications: 0,
        connections: 0,
        likes: 0,
        perChat: {}
      };
    }

    const userIdStr =
      userId.toString();

    // ======================================================
    // CACHE HIT
    // ======================================================

    if (!forceRefresh) {

      const cached =
        countCache.get(userIdStr);

      if (
        cached &&
        Date.now() -
          cached.timestamp <
          CACHE_TTL
      ) {

        return cached.data;
      }
    }

    // ======================================================
    // DEDUPLICATION
    // ======================================================

    if (
      pendingCounts.has(userIdStr) &&
      !forceRefresh
    ) {

      return pendingCounts.get(
        userIdStr
      );
    }

    const fetchPromise =
      (async () => {

        try {

          const oid =
            new mongoose.Types.ObjectId(
              userIdStr
            );

          // ======================================================
          // CONNECTIONS
          // ======================================================

          const connections =
            await Connection.find(

              {
                users: oid,
                status: 'active'
              },

              '_id'
            ).lean();

          const connectionIds =
            connections.map(
              c => c._id
            );

          // ======================================================
          // PARALLEL COUNTS
          // ======================================================

          const [

            notifications,

            likes,

            perChatResults

          ] = await Promise.all([

            Notification.countDocuments({
              user: oid,
              isRead: false
            }),

            Like.countDocuments({
              toUser: oid,
              isRead: false
            }),

            connectionIds.length === 0

              ? Promise.resolve([])

              : Message.aggregate([

                  {
                    $match: {

                      connectionId: {
                        $in:
                          connectionIds
                      },

                      isRead: false,

                      sender: {
                        $ne: oid
                      }
                    }
                  },

                  {
                    $group: {

                      _id:
                        '$connectionId',

                      count: {
                        $sum: 1
                      }
                    }
                  }

                ]).hint({
                  connectionId: 1,
                  isRead: 1
                })
          ]);

          // ======================================================
          // BUILD MESSAGE STATS
          // ======================================================

          const perChat = {};

          let totalMessages = 0;

          perChatResults.forEach(
            (chat) => {

              const count =
                chat.count || 0;

              perChat[
                chat._id.toString()
              ] = count;

              totalMessages += count;
            }
          );

          const result = {

            messages:
              totalMessages,

            notifications,

            connections:
              connectionIds.length,

            likes,

            perChat
          };

          // ======================================================
          // CACHE RESULT
          // ======================================================

          countCache.set(
            userIdStr,

            {
              timestamp:
                Date.now(),

              data: result
            }
          );

          return result;

        } catch (error) {

          console.error(
            '[GET USER COUNTS ERROR]:',
            error
          );

          return {

            messages: 0,
            notifications: 0,
            connections: 0,
            likes: 0,
            perChat: {}
          };

        } finally {

          pendingCounts.delete(
            userIdStr
          );
        }
      })();

    if (!forceRefresh) {

      pendingCounts.set(
        userIdStr,
        fetchPromise
      );
    }

    return fetchPromise;

  } catch (error) {

    console.error(
      '[COUNTS OUTER ERROR]:',
      error
    );

    return {

      messages: 0,
      notifications: 0,
      connections: 0,
      likes: 0,
      perChat: {}
    };
  }
};



// ======================================================
// GET ONLINE CONNECTIONS
// ======================================================

const getOnlineConnections =
  async (
    userId,
    forceRefresh = false
  ) => {

    try {

      if (!userId) {
        return [];
      }

      const userIdStr =
        userId.toString();

      // ======================================================
      // CACHE HIT
      // ======================================================

      if (!forceRefresh) {

        const cached =
          onlineCache.get(
            userIdStr
          );

        if (
          cached &&
          Date.now() -
            cached.timestamp <
            CACHE_TTL
        ) {

          return cached.data;
        }
      }

      // ======================================================
      // DEDUPLICATION
      // ======================================================

      if (
        pendingOnline.has(
          userIdStr
        ) &&
        !forceRefresh
      ) {

        return pendingOnline.get(
          userIdStr
        );
      }

      const fetchPromise =
        (async () => {

          try {

            const connections =
              await Connection.find(

                {
                  users: userId,
                  status: 'active'
                },

                `
                userDetails
                `
              )
                .sort({
                  updatedAt: -1
                })
                .limit(100)
                .lean();

            const result =
              connections
                .map((conn) => {

                  const otherUser =
                    conn.userDetails?.find(
                      u =>
                        u._id.toString() !==
                        userIdStr
                    );

                  if (
                    !otherUser
                  ) {
                    return null;
                  }

                  if (
                    otherUser.onlineStatus !==
                    'online'
                  ) {
                    return null;
                  }

                  return {

                    connectionId:
                      conn._id,

                    user:
                      otherUser
                  };
                })
                .filter(Boolean);

            // ======================================================
            // CACHE
            // ======================================================

            onlineCache.set(
              userIdStr,

              {
                timestamp:
                  Date.now(),

                data: result
              }
            );

            return result;

          } catch (error) {

            console.error(
              '[ONLINE CONNECTION ERROR]:',
              error
            );

            return [];

          } finally {

            pendingOnline.delete(
              userIdStr
            );
          }
        })();

      if (!forceRefresh) {

        pendingOnline.set(
          userIdStr,
          fetchPromise
        );
      }

      return fetchPromise;

    } catch (error) {

      console.error(
        '[ONLINE OUTER ERROR]:',
        error
      );

      return [];
    }
  };



module.exports = {

  getUserCounts,

  getOnlineConnections
};