const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const User = require('../models/User');
const Connection = require('../models/Connection');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const auth = require('../middleware/auth');



// ======================================================
// DISCOVER USERS
// ======================================================

router.get('/discover', auth, async (req, res) => {

  try {

    const currentUser = await User.findById(
      req.userId,

      `
      age
      interests
      blockedUsers
      matchPreferences
      `
    ).lean();

    if (!currentUser) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const recentTime = new Date(
      Date.now() - 1000 * 60 * 60 * 24
    );

    const query = {

      _id: {
        $nin: [
          req.userId,
          ...(currentUser.blockedUsers || [])
        ]
      },

      role: 'user',

      status: 'active',

      isShadowBanned: false,

      lastSeen: {
        $gte: recentTime
      }
    };

    // ======================================================
    // GENDER FILTER
    // ======================================================

    if (
      currentUser.matchPreferences?.gender &&
      currentUser.matchPreferences.gender !== 'All'
    ) {

      query.gender =
        currentUser.matchPreferences.gender;
    }

    // ======================================================
    // AGE FILTER
    // ======================================================

    if (
      currentUser.matchPreferences?.ageRange
    ) {

      query.age = {
        $gte:
          currentUser.matchPreferences
            .ageRange.min,

        $lte:
          currentUser.matchPreferences
            .ageRange.max
      };
    }

    // ======================================================
    // INTEREST FILTER
    // ======================================================

    if (
      currentUser.matchPreferences
        ?.interests?.length > 0
    ) {

      query.interests = {
        $in:
          currentUser.matchPreferences
            .interests
      };
    }

    const users = await User.find(

      query,

      `
      username
      fullName
      profilePic
      age
      gender
      bio
      interests
      onlineStatus
      isPremium
      lastSeen
      `
    )
      .sort({
        isPremium: -1,
        createdAt: -1
      })
      .limit(20)
      .lean();

    res.json(users);

  } catch (error) {

    console.error(
      '[DISCOVER ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// GET CURRENT USER
// ======================================================

router.get('/me', auth, async (req, res) => {

  try {

    const user = await User.findById(

      req.userId,

      `
      username
      email
      profilePic
      fullName
      age
      dob
      gender
      location
      interests
      bio
      isProfileComplete
      onlineStatus
      isVerified
      isPremium
      premiumExpiresAt
      boosts
      settings
      notificationPreferences
      matchPreferences
      notificationCount
      favorites
      createdAt
      `
    ).lean();

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(user);

  } catch (error) {

    console.error(
      '[ME ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// GET SINGLE USER
// ======================================================

router.get('/:id', auth, async (req, res) => {

  try {

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const user = await User.findById(

      req.params.id,

      `
      username
      fullName
      profilePic
      age
      gender
      bio
      interests
      onlineStatus
      isPremium
      lastSeen
      `
    ).lean();

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // ======================================================
    // PROFILE VIEW COUNT
    // ======================================================

    if (
      req.userId.toString() !==
      req.params.id.toString()
    ) {

      User.updateOne(
        {
          _id: req.params.id
        },
        {
          $inc: {
            profileViews: 1
          }
        }
      ).catch(() => {});
    }

    const connectionCount =
      await Connection.countDocuments({
        users: req.params.id
      });

    res.json({
      ...user,
      connectionCount
    });

  } catch (error) {

    console.error(
      '[GET USER ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// UPDATE PROFILE
// ======================================================

router.patch('/profile/update', auth, async (req, res) => {

  try {

    const allowedUpdates = [

      'fullName',
      'age',
      'dob',
      'gender',
      'location',
      'bio',
      'interests',
      'profilePic',
      'settings',
      'notificationPreferences',
      'matchPreferences',
      'lowBandwidth'
    ];

    const updates = {};

    allowedUpdates.forEach((field) => {

      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // ======================================================
    // PROFILE COMPLETE CHECK
    // ======================================================

    const requiredFields = [
      'fullName',
      'age',
      'gender',
      'bio',
      'profilePic'
    ];

    const existingUser = await User.findById(
      req.userId
    ).lean();

    const mergedUser = {
      ...existingUser,
      ...updates
    };

    const isComplete =
      requiredFields.every(
        field => !!mergedUser[field]
      );

    updates.isProfileComplete =
      isComplete;

    const updatedUser =
      await User.findByIdAndUpdate(

        req.userId,

        {
          $set: updates
        },

        {
          new: true,
          runValidators: true
        }
      ).select(
        `
        username
        profilePic
        fullName
        age
        gender
        bio
        interests
        isProfileComplete
        `
      );

    // ======================================================
    // UPDATE SNAPSHOTS
    // ======================================================

    Connection.updateMany(
      {
        'userDetails._id': req.userId
      },
      {
        $set: {
          'userDetails.$[elem].username':
            updatedUser.username,

          'userDetails.$[elem].profilePic':
            updatedUser.profilePic
        }
      },
      {
        arrayFilters: [
          {
            'elem._id':
              new mongoose.Types.ObjectId(
                req.userId
              )
          }
        ]
      }
    ).catch(() => {});

    Message.updateMany(
      {
        'senderInfo._id': req.userId
      },
      {
        $set: {
          'senderInfo.username':
            updatedUser.username,

          'senderInfo.profilePic':
            updatedUser.profilePic
        }
      }
    ).catch(() => {});

    Notification.updateMany(
      {
        'fromUser._id': req.userId
      },
      {
        $set: {
          'fromUser.username':
            updatedUser.username,

          'fromUser.profilePic':
            updatedUser.profilePic
        }
      }
    ).catch(() => {});

    res.json(updatedUser);

  } catch (error) {

    console.error(
      '[UPDATE PROFILE ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// UPDATE ONLINE STATUS
// ======================================================

router.post('/presence/update', auth, async (req, res) => {

  try {

    const {
      status
    } = req.body;

    const allowedStatuses = [
      'online',
      'offline',
      'away'
    ];

    if (
      !allowedStatuses.includes(status)
    ) {

      return res.status(400).json({
        error: 'Invalid status'
      });
    }

    await User.updateOne(
      {
        _id: req.userId
      },
      {
        $set: {
          onlineStatus: status,
          lastSeen: new Date()
        }
      }
    );

    res.json({
      success: true
    });

  } catch (error) {

    console.error(
      '[PRESENCE ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// BLOCK USER
// ======================================================

router.post('/block/:id', auth, async (req, res) => {

  try {

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {

      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    if (
      req.userId.toString() ===
      req.params.id.toString()
    ) {

      return res.status(400).json({
        error:
          'Cannot block yourself'
      });
    }

    await User.updateOne(
      {
        _id: req.userId
      },
      {
        $addToSet: {
          blockedUsers:
            req.params.id
        }
      }
    );

    // ======================================================
    // REMOVE CONNECTION
    // ======================================================

    await Connection.deleteMany({
      users: {
        $all: [
          req.userId,
          req.params.id
        ]
      }
    });

    res.json({
      success: true
    });

  } catch (error) {

    console.error(
      '[BLOCK ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



// ======================================================
// UNBLOCK USER
// ======================================================

router.post('/unblock/:id', auth, async (req, res) => {

  try {

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {

      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    await User.updateOne(
      {
        _id: req.userId
      },
      {
        $pull: {
          blockedUsers:
            req.params.id
        }
      }
    );

    res.json({
      success: true
    });

  } catch (error) {

    console.error(
      '[UNBLOCK ERROR]:',
      error
    );

    res.status(500).json({
      error: 'Server error'
    });
  }
});



module.exports = router;