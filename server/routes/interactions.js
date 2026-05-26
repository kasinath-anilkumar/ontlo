// routes/interactions.js

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const User =
  require('../models/User');

const Like =
  require('../models/Like');

const Notification =
  require('../models/Notification');

const auth =
  require('../middleware/auth');

const {
  emitConnectionUpdate,
  emitCountsUpdate,
  emitNotification
} = require('../utils/realtime');

const safeOnlineStatus = (status) => (
  ['online', 'offline', 'away'].includes(status)
    ? status
    : 'offline'
);

const buildPairKey = (userId, targetUserId) =>
  [userId.toString(), targetUserId.toString()].sort().join('_');

const buildUserSnapshot = (user) => ({
  _id: user._id,
  username: user.username,
  profilePic: user.profilePic || '',
  onlineStatus: safeOnlineStatus(user.onlineStatus)
});

const createConnectionForPair = async (userId, targetUserId) => {
  const Connection = require('../models/Connection');
  const pairKey = buildPairKey(userId, targetUserId);

  const existingConn = await Connection.findOne({
    pairKey
  }).lean();

  if (existingConn) {
    return {
      connection: existingConn,
      created: false
    };
  }

  const [
    currentUserFull,
    targetUserFull
  ] = await Promise.all([
    User.findById(userId).select('username profilePic onlineStatus').lean(),
    User.findById(targetUserId).select('username profilePic onlineStatus').lean()
  ]);

  if (!currentUserFull || !targetUserFull) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  let newConn;

  try {
    newConn = await Connection.create({
      users: [userId, targetUserId],
      pairKey,
      userDetails: [
        buildUserSnapshot(currentUserFull),
        buildUserSnapshot(targetUserFull)
      ]
    });
  } catch (error) {
    if (error.code === 11000) {
      const racedConn = await Connection.findOne({
        pairKey
      }).lean();

      if (racedConn) {
        return {
          connection: racedConn,
          created: false
        };
      }
    }

    throw error;
  }

  return {
    connection: newConn,
    created: true,
    currentUser: currentUserFull,
    targetUser: targetUserFull
  };
};



// ======================================================
// GET RECEIVED LIKES
// ======================================================

router.get(
  '/received',

  auth,

  async (req, res) => {

    try {

      const likes =
        await Like.find(

          {
            toUser:
              req.user.id
          }
        )

          .populate(

            'fromUser',

            `
            username
            profilePic
            age
            gender
            bio
            isPremium
            onlineStatus
            `
          )

          .sort({
            createdAt: -1
          })

          .limit(50)

          .lean();

      res.json(
        likes
      );

    } catch (error) {

      console.error(
        '[RECEIVED LIKES ERROR]:',
        error
      );

      res.status(500).json({

        error:
          'Server error'
      });
    }
  }
);



// ======================================================
// SEND LIKE
// ======================================================

router.post(
  '/:userId',

  auth,

  async (req, res) => {

    try {

      const targetUserId =
        req.params.userId;

      const currentUserId =
        req.userId;

      // ======================================================
      // VALIDATION
      // ======================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          targetUserId
        )
      ) {

        return res.status(400).json({

          error:
            'Invalid user id'
        });
      }

      // ======================================================
      // SELF LIKE
      // ======================================================

      if (
        targetUserId ===
        currentUserId
      ) {

        return res.status(400).json({

          error:
            'Cannot like yourself'
        });
      }

      // ======================================================
      // TARGET USER EXISTS
      // ======================================================

      const targetUser =
        await User.findById(

          targetUserId,

          '_id'
        ).lean();

      if (!targetUser) {

        return res.status(404).json({

          error:
            'User not found'
        });
      }

      const Connection = require('../models/Connection');
      const existingConnection =
        await Connection.findOne({
          pairKey: buildPairKey(currentUserId, targetUserId)
        }).lean();

      if (existingConnection) {
        if (existingConnection.status !== 'active') {
          return res.status(409).json({
            error: 'Connection is blocked'
          });
        }

        return res.json({
          success: true,
          isMatch: true,
          connectionId: existingConnection._id
        });
      }

      // ======================================================
      // DUPLICATE LIKE
      // ======================================================

      const existingLike =
        await Like.findOne({

          fromUser:
            currentUserId,

          toUser:
            targetUserId
        }).lean();

      if (existingLike) {

        return res.status(400).json({

          error:
            'Already liked'
        });
      }

      // ======================================================
      // MUTUAL LIKE CHECK (Immediate Match)
      // ======================================================

      const mutualLike =
        await Like.findOne({
          fromUser:
            targetUserId,

          toUser:
            currentUserId
        }).lean();

      if (mutualLike) {

        const {
          connection: newConn,
          created,
          currentUser: currentUserFull,
          targetUser: targetUserFull
        } = await createConnectionForPair(
          currentUserId,
          targetUserId
        );

        if (created) {
          // ======================================================
          // NOTIFICATIONS (BOTH)
          // ======================================================

          // Notify Target
          Notification.create({
            user: targetUserId,
            type: 'match',
            content: `You matched with ${currentUserFull.username}!`,
            fromUser: {
              _id: currentUserFull._id,
              username: currentUserFull.username,
              profilePic: currentUserFull.profilePic
            }
          }).catch(() => {});

          // Notify Current
          Notification.create({
            user: currentUserId,
            type: 'match',
            content: `You matched with ${targetUserFull.username}!`,
            fromUser: {
              _id: targetUserFull._id,
              username: targetUserFull.username,
              profilePic: targetUserFull.profilePic
            }
          }).catch(() => {});

          // ======================================================
          // REALTIME (BOTH)
          // ======================================================

          if (req.io) {
            emitConnectionUpdate(req.io, newConn, 'new-connection');
            emitCountsUpdate(req.io, targetUserId);
            emitCountsUpdate(req.io, currentUserId);

            // To Target
            req.io.to(`user_${targetUserId}`).emit('new-match', {
              connectionId: newConn._id,
              user: {
                _id: currentUserFull._id,
                username: currentUserFull.username,
                profilePic: currentUserFull.profilePic
              }
            });

            // To Current
            req.io.to(`user_${currentUserId}`).emit('new-match', {
              connectionId: newConn._id,
              user: {
                _id: targetUserFull._id,
                username: targetUserFull.username,
                profilePic: targetUserFull.profilePic
              }
            });
          }
        }

        // Cleanup likes
        await Like.deleteMany({
          $or: [
            { fromUser: currentUserId, toUser: targetUserId },
            { fromUser: targetUserId, toUser: currentUserId }
          ]
        });

        return res.json({
          success: true,
          isMatch: true
        });
      }

      // ======================================================
      // CREATE LIKE (Standard)
      // ======================================================

      const currentUser =
        await User.findById(

          currentUserId,

          `
          username
          profilePic
          `
        ).lean();

      if (!currentUser) {

        return res.status(404).json({

          error:
            'User not found'
        });
      }

      await Like.create({

        fromUser:
          currentUserId,

        toUser:
          targetUserId
      });

      // ======================================================
      // CREATE NOTIFICATION
      // ======================================================

      Notification.create({

        user:
          targetUserId,

        type:
          'like',

        content:
          `${currentUser?.username || 'Someone'} sent you a connection request`,

        fromUser: {

          _id:
            currentUser?._id,

          username:
            currentUser?.username || 'User',

          profilePic:
            currentUser?.profilePic || ''
        }

      }).catch(() => {});

      // ======================================================
      // REALTIME
      // ======================================================

      if (req.io) {

        req.io
          .to(
            `user_${targetUserId}`
          )

          .emit(
            'new-like',

            {
              fromUser: {
                _id: currentUser?._id,
                username: currentUser?.username,
                profilePic: currentUser?.profilePic
              }
            }
          );

        // 🔥 Standard notification event for toasts
        req.io.to(`user_${targetUserId}`).emit('new-notification', {
          type: 'like',
          content: `${currentUser?.username || 'Someone'} sent you a connection request`,
          fromUser: {
            _id: currentUser?._id,
            username: currentUser?.username,
            profilePic: currentUser?.profilePic
          }
        });

        req.io
          .to(
            `user_${targetUserId}`
          )

          .emit(
            'counts-delta',

            {
              connections: 1
            }
          );

        emitCountsUpdate(req.io, targetUserId);
      }

      res.json({

        success: true,
        isMatch: false
      });

    } catch (error) {

      console.error(
        '[LIKE ERROR]:',
        error
      );

      // Duplicate index protection
      if (
        error.code === 11000
      ) {

        return res.status(400).json({

          error:
            'Already liked'
        });
      }

      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Server error'
      });
    }
  }
);



// ======================================================
// CANCEL SENT CONNECTION REQUEST
// ======================================================

router.delete(
  '/:userId',

  auth,

  async (req, res) => {

    try {

      const targetUserId =
        req.params.userId;

      const currentUserId =
        req.userId;

      if (
        !mongoose.Types.ObjectId.isValid(
          targetUserId
        )
      ) {

        return res.status(400).json({

          error:
            'Invalid user id'
        });
      }

      if (
        targetUserId ===
        currentUserId
      ) {

        return res.status(400).json({

          error:
            'Cannot cancel request to yourself'
        });
      }

      const deletedLike =
        await Like.findOneAndDelete({

          fromUser:
            currentUserId,

          toUser:
            targetUserId
        }).lean();

      if (!deletedLike) {

        return res.status(404).json({

          error:
            'No pending request found'
        });
      }

      await Notification.deleteOne({

        user:
          targetUserId,

        type:
          'like',

        'fromUser._id':
          new mongoose.Types.ObjectId(
            currentUserId
          )
      });

      if (req.io) {

        req.io
          .to(
            `user_${targetUserId}`
          )
          .emit(
            'connection-request-cancelled',
            {
              fromUserId:
                currentUserId
            }
          );

        emitCountsUpdate(
          req.io,
          targetUserId
        );
      }

      res.json({

        success:
          true,

        connectionStatus:
          'none'
      });

    } catch (error) {

      console.error(
        '[CANCEL REQUEST ERROR]:',
        error
      );

      res.status(500).json({

        error:
          'Server error'
      });
    }
  }
);



// ======================================================
// ACCEPT CONNECTION REQUEST
// ======================================================

router.post(
  '/accept/:userId',

  auth,

  async (req, res) => {

    try {

      const targetUserId =
        req.params.userId;

      const currentUserId =
        req.userId;

      // ======================================================
      // VALIDATE
      // ======================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          targetUserId
        )
      ) {
        return res.status(400).json({
          error: 'Invalid user id'
        });
      }

      // ======================================================
      // FIND REQUEST (LIKE)
      // ======================================================

      const matchRequest =
        await Like.findOne({
          fromUser:
            targetUserId,

          toUser:
            currentUserId
        }).lean();

      if (!matchRequest) {

        const Connection = require('../models/Connection');
        const existingConnection = await Connection.findOne({
          pairKey: buildPairKey(currentUserId, targetUserId)
        }).lean();

        if (existingConnection) {
          if (existingConnection.status !== 'active') {
            return res.status(409).json({
              error: 'Connection is blocked'
            });
          }

          return res.json({
            success: true,
            message: 'Match accepted',
            connectionId: existingConnection._id
          });
        }

        return res.status(404).json({

          error:
            'No pending request found'
        });
      }

      // ======================================================
      // CREATE CONNECTION
      // ======================================================

      const {
        connection: newConn,
        created,
        currentUser: currentUserFull,
        targetUser: targetUserFull
      } = await createConnectionForPair(
        currentUserId,
        targetUserId
      );

      if (created) {
        // ======================================================
        // NOTIFICATIONS
        // ======================================================

        Notification.create({
          user: targetUserId,
          type: 'match',
          content: `Connection request accepted! You matched with ${currentUserFull.username}!`,
          fromUser: {
            _id: currentUserFull._id,
            username: currentUserFull.username,
            profilePic: currentUserFull.profilePic
          }
        }).catch(() => {});
        // ======================================================
        // REALTIME
        // ======================================================

        if (req.io) {
          emitConnectionUpdate(req.io, newConn, 'new-connection');
          emitCountsUpdate(req.io, targetUserId);
          emitCountsUpdate(req.io, currentUserId);

          // 🔥 Standard notification event for toasts
          req.io.to(`user_${targetUserId}`).emit('new-match', {
            connectionId: newConn._id,
            user: {
              _id: currentUserFull._id,
              username: currentUserFull.username,
              profilePic: currentUserFull.profilePic
            }
          });

          // 🔥 Create persistent Notification in DB
          const Notification = require('../models/Notification');
          await Notification.create([
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
              user: currentUserId,
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

          // 🔥 Update unread badge counts
          req.io.to(`user_${targetUserId}`).emit('counts-delta', {
            connections: 1,
            notifications: 1
          });
          
          req.io.to(`user_${currentUserId}`).emit('counts-delta', {
            connections: 1,
            notifications: 1
          });

          // Standard notification event for toasts
          req.io.to(`user_${targetUserId}`).emit('new-notification', {
            type: 'match',
            content: `Connection request accepted! You matched with ${currentUserFull.username}!`,
            fromUser: {
              _id: currentUserFull._id,
              username: currentUserFull.username,
              profilePic: currentUserFull.profilePic
            }
          });
        }
      }

      // Cleanup likes
      await Like.deleteMany({
        $or: [
          { fromUser: currentUserId, toUser: targetUserId },
          { fromUser: targetUserId, toUser: currentUserId }
        ]
      });

      res.json({
        success: true,
        message: 'Match accepted'
      });

    } catch (error) {

      console.error(
        '[ACCEPT ERROR]:',
        error
      );

      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Server error'
      });
    }
  }
);



// ======================================================
// GET FAVORITES
// ======================================================

router.get(
  '/favorites',

  auth,

  async (req, res) => {

    try {

      const user =
        await User.findById(

          req.user.id,

          'favorites'
        )

          .populate(

            'favorites',

            `
            username
            profilePic
            age
            gender
            bio
            onlineStatus
            isPremium
            `
          )

          .lean();

      res.json(

        user?.favorites || []
      );

    } catch (error) {

      console.error(
        '[GET FAVORITES ERROR]:',
        error
      );

      res.status(500).json({

        error:
          'Server error'
      });
    }
  }
);



// ======================================================
// TOGGLE FAVORITE
// ======================================================

router.post(
  '/favorites/:userId',

  auth,

  async (req, res) => {

    try {

      const targetUserId =
        req.params.userId;

      // ======================================================
      // VALIDATION
      // ======================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          targetUserId
        )
      ) {

        return res.status(400).json({

          error:
            'Invalid user id'
        });
      }

      // ======================================================
      // SELF FAVORITE
      // ======================================================

      if (
        targetUserId ===
        req.user.id
      ) {

        return res.status(400).json({

          error:
            'Cannot favorite yourself'
        });
      }

      // ======================================================
      // USER EXISTS
      // ======================================================

      const targetUser =
        await User.findById(

          targetUserId,

          '_id'
        ).lean();

      if (!targetUser) {

        return res.status(404).json({

          error:
            'User not found'
        });
      }

      // ======================================================
      // LOAD USER
      // ======================================================

      const user =
        await User.findById(

          req.user.id,

          'favorites'
        );

      if (!user) {

        return res.status(404).json({

          error:
            'User not found'
        });
      }

      const targetOid =
        new mongoose.Types.ObjectId(
          targetUserId
        );

      // ======================================================
      // EXISTS?
      // ======================================================

      const exists =
        user.favorites.some(

          id =>
            id.toString() ===
            targetUserId
        );

      // ======================================================
      // REMOVE
      // ======================================================

      if (exists) {

        user.favorites =
          user.favorites.filter(

            id =>
              id.toString() !==
              targetUserId
          );

      } else {

        // ======================================================
        // LIMIT FAVORITES
        // ======================================================

        if (
          user.favorites.length >=
          500
        ) {

          return res.status(400).json({

            error:
              'Favorite limit reached'
          });
        }

        user.favorites.push(
          targetOid
        );
      }

      await user.save();

      res.json({

        success: true,

        isFavorite:
          !exists
      });

    } catch (error) {

      console.error(
        '[TOGGLE FAVORITE ERROR]:',
        error
      );

      res.status(500).json({

        error:
          'Server error'
      });
    }
  }
);



// ======================================================
// DECLINE CONNECTION REQUEST
// ======================================================

router.post(
  '/decline/:userId',
  auth,
  async (req, res) => {
    try {
      const targetUserId = req.params.userId;
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user id' });
      }

      // Delete the pending Like request
      await Like.deleteOne({
        fromUser: targetUserId,
        toUser: req.user.id
      });

      // Also delete the notification of type 'like' from this user
      await Notification.deleteOne({
        user: req.user.id,
        type: 'like',
        'fromUser._id': new mongoose.Types.ObjectId(targetUserId)
      });

      if (req.io) {
        emitCountsUpdate(req.io, req.user.id);
      }

      res.json({ success: true, message: 'Connection request declined' });
    } catch (error) {
      console.error('[DECLINE ERROR]:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);



module.exports =
  router;
