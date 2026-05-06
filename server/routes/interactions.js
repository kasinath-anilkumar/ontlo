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
        req.user.id
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

      // ======================================================
      // DUPLICATE LIKE
      // ======================================================

      const existingLike =
        await Like.findOne({

          fromUser:
            req.user.id,

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
            req.user.id
        }).lean();

      if (mutualLike) {

        // ======================================================
        // CREATE CONNECTION
        // ======================================================

        const Connection = require('../models/Connection');

        // Check if connection already exists (failsafe)
        const sortedIds = [
          req.user.id,
          targetUserId
        ].sort();

        const pairKey = sortedIds.join('_');

        const existingConn = await Connection.findOne({
          pairKey
        }).lean();

        if (!existingConn) {

          const targetUserFull = await User.findById(targetUserId).select('username profilePic onlineStatus').lean();
          const currentUserFull = await User.findById(req.user.id).select('username profilePic onlineStatus').lean();

          await Connection.create({
            users: [req.user.id, targetUserId],
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
            user: req.user.id,
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

            // To Target
            req.io.to(`user_${targetUserId}`).emit('new-match', {
              user: {
                _id: currentUserFull._id,
                username: currentUserFull.username,
                profilePic: currentUserFull.profilePic
              }
            });

            // To Current
            req.io.to(`user_${req.user.id}`).emit('new-match', {
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
            { fromUser: req.user.id, toUser: targetUserId },
            { fromUser: targetUserId, toUser: req.user.id }
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

      await Like.create({

        fromUser:
          req.user.id,

        toUser:
          targetUserId
      });

      // ======================================================
      // LOAD CURRENT USER
      // ======================================================

      const currentUser =
        await User.findById(

          req.user.id,

          `
          username
          profilePic
          `
        ).lean();

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
            req.user.id
        }).lean();

      if (!matchRequest) {

        return res.status(404).json({

          error:
            'No pending request found'
        });
      }

      // ======================================================
      // CREATE CONNECTION
      // ======================================================

      const Connection = require('../models/Connection');

      const sortedIds = [
        req.user.id,
        targetUserId
      ].sort();

      const pairKey = sortedIds.join('_');

      const existingConn = await Connection.findOne({
        pairKey
      }).lean();

      if (!existingConn) {

        const targetUserFull = await User.findById(targetUserId).select('username profilePic onlineStatus').lean();
        const currentUserFull = await User.findById(req.userId).select('username profilePic onlineStatus').lean();

        if (!targetUserFull || !currentUserFull) {
          return res.status(404).json({
            error: 'User not found'
          });
        }

        await Connection.create({
          users: [req.userId, targetUserId],
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

          req.io.to(`user_${targetUserId}`).emit('new-match', {
            user: {
              _id: currentUserFull._id,
              username: currentUserFull.username,
              profilePic: currentUserFull.profilePic
            }
          });

          // 🔥 Standard notification event for toasts
          req.io.to(`user_${targetUserId}`).emit('new-notification', {
            type: 'match',
            content: `Connection request accepted! You matched with ${currentUserFull.username}!`,
            fromUser: {
              _id: currentUserFull._id,
              username: currentUserFull.username,
              profilePic: currentUserFull.profilePic
            }
          });

          // 🔥 Update unread badge counts
          req.io.to(`user_${targetUserId}`).emit('counts-delta', {
            connections: 1
          });
        }
      }

      // Cleanup likes
      await Like.deleteMany({
        $or: [
          { fromUser: req.userId, toUser: targetUserId },
          { fromUser: targetUserId, toUser: req.userId }
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

      res.status(500).json({
        error: 'Server error'
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



module.exports =
  router;