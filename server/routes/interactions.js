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
      // CREATE LIKE
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
          `${currentUser?.username || 'Someone'} liked you`,

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

                _id:
                  currentUser?._id,

                username:
                  currentUser?.username,

                profilePic:
                  currentUser?.profilePic
              }
            }
          );

        req.io
          .to(
            `user_${targetUserId}`
          )

          .emit(
            'counts-delta',

            {

              notifications: 1,

              likes: 1
            }
          );
      }

      res.json({

        success: true
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