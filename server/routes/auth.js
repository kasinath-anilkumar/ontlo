// routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();

const User =
  require('../models/User');

const validate =
  require('../middleware/validate');

const auth =
  require('../middleware/auth');

const cacheUtil =
  require('../utils/cache');

const rateLimit =
  require('express-rate-limit');

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET
} = require('../config/jwt');

const {
  setupSchema,
  registerSchema,
  loginSchema,
  completeProfileSchema
} = require('../validators/auth.validator');

const {
  logActivity
} = require('../utils/logger');



// ======================================================
// CONSTANTS
// ======================================================

const MINIMUM_AGE = 13;

const MAXIMUM_AGE = 120;

const ACCESS_EXPIRES =
  '15m';

const REFRESH_EXPIRES =
  '7d';



// ======================================================
// RATE LIMITERS
// ======================================================

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error:
      'Too many registrations from this IP'
  },
  standardHeaders: true,
  legacyHeaders: false
});



// ======================================================
// COOKIE OPTIONS
// ======================================================

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/'
};



// ======================================================
// GENERATE TOKENS
// ======================================================

const generateTokens =
  async (
    user,
    res
  ) => {

    const accessToken =
      jwt.sign(

        {
          id: user._id,
          username:
            user.username
        },

        JWT_SECRET,

        {
          expiresIn:
            ACCESS_EXPIRES
        }
      );

    const refreshToken =
      jwt.sign(

        {
          id: user._id
        },

        JWT_REFRESH_SECRET,

        {
          expiresIn:
            REFRESH_EXPIRES
        }
      );

    // ======================================================
    // SAVE REFRESH TOKEN
    // ======================================================

    await User.findByIdAndUpdate(

      user._id,

      {

        $push: {

          refreshTokens: {

            $each: [
              {
                token:
                  refreshToken
              }
            ],

            $slice: -10
          }
        }
      }
    );

    // ======================================================
    // COOKIES
    // ======================================================

    res.cookie(

      'token',

      accessToken,

      {

        ...cookieOptions,

        maxAge:
          15 *
          60 *
          1000
      }
    );

    res.cookie(
      'refreshToken',
      refreshToken,
      {
        ...cookieOptions,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    );

    console.log(`[Auth] Tokens generated and cookies set for user: ${user.username || user._id}`);
    return accessToken;
  };



// ======================================================
// AGE CALCULATOR
// ======================================================

const calculateAge =
  (
    dob,
    now = new Date()
  ) => {

    let age =
      now.getFullYear() -
      dob.getFullYear();

    const monthDiff =
      now.getMonth() -
      dob.getMonth();

    if (

      monthDiff < 0 ||

      (
        monthDiff === 0 &&
        now.getDate() <
        dob.getDate()
      )
    ) {

      age--;
    }

    return age;
  };



// ======================================================
// AGE VALIDATION
// ======================================================

const validateAgeGate =
  ({
    age,
    dob
  }) => {

    if (dob) {

      if (
        Number.isNaN(
          dob.getTime()
        )
      ) {

        return {
          error:
            'Invalid date of birth'
        };
      }

      const realAge =
        calculateAge(dob);

      if (
        realAge <
        MINIMUM_AGE
      ) {

        return {
          error:
            `Minimum age is ${MINIMUM_AGE}`
        };
      }

      if (
        realAge >
        MAXIMUM_AGE
      ) {

        return {
          error:
            'Invalid age'
        };
      }

      return {
        age:
          realAge
      };
    }

    if (
      age &&
      (
        age < MINIMUM_AGE ||
        age > MAXIMUM_AGE
      )
    ) {

      return {
        error:
          'Invalid age'
      };
    }

    return {
      age
    };
  };



// ======================================================
// SETUP STATUS
// ======================================================

router.get(
  '/setup/status',

  async (
    req,
    res
  ) => {

    try {

      const count =
        await User.countDocuments({

          role:
            'superadmin'
        });

      res.json({

        isSetupComplete:
          count > 0
      });

    } catch (error) {

      res.status(500).json({

        error:
          'Server error'
      });
    }
  }
);



// ======================================================
// CURRENT USER
// ======================================================

router.get(
  '/me',
  auth,
  async (req, res) => {
    const label = `me_${Date.now()}`;
    console.time(label);
    try {
      // explain query if requested
      if (req.query.explain) {
        const explanation = await User.findById(req.userId).select('-password -refreshTokens').explain('executionStats');
        return res.json(explanation);
      }

      const cacheKey = `user_me_${req.userId}`;
      const user = await cacheUtil.getOrSet(cacheKey, async () => {
        return await User.findById(
          req.userId,
          'username email profilePic fullName isProfileComplete onlineStatus isVerified isPremium notificationCount role'
        ).maxTimeMS(2000).lean();
      }, 30); // Cache for 30s

      console.timeEnd(label);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('[ME ERROR]:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);



// ======================================================
// USERNAME CHECK
// ======================================================

router.post(
  '/check-username',

  async (
    req,
    res
  ) => {

    try {

      const username =
        req.body.username
          ?.trim();

      if (!username) {

        return res.status(400).json({

          error:
            'Username required'
        });
      }

      const exists =
        await User.findOne(

          {
            username
          },

          '_id'
        ).lean();

      res.json({

        available:
          !exists
      });

    } catch (error) {

      res.status(500).json({

        error:
          'Server error'
      });
    }
  }
);



// ======================================================
// INITIAL SETUP
// ======================================================

router.post(
  '/setup',

  validate({
    body:
      setupSchema
  }),

  async (
    req,
    res
  ) => {

    try {

      const adminExists =
        await User.countDocuments({

          role:
            'superadmin'
        });

      if (
        adminExists > 0
      ) {

        return res.status(403).json({

          error:
            'Setup already completed'
        });
      }

      const {
        username,
        password,
        email
      } = req.body;

      const exists =
        await User.findOne({

          username
        }).lean();

      if (exists) {

        return res.status(400).json({

          error:
            'Username already exists'
        });
      }

      // ======================================================
      // HASH PASSWORD
      // ======================================================

      const hashedPassword =
        await bcrypt.hash(
          password,
          8
        );

      const admin =
        await User.create({

          username,

          email,

          password:
            hashedPassword,

          fullName:
            'System Administrator',

          role:
            'superadmin',

          status:
            'active',

          isVerified:
            true,

          isProfileComplete:
            true
        });

      const token =
        await generateTokens(
          admin,
          res
        );

      res.status(201).json({

        message:
          'Setup completed',

        token,

        user: {

          id:
            admin._id,

          username:
            admin.username,

          role:
            admin.role
        }
      });

    } catch (error) {

      console.error(
        '[SETUP ERROR]:',
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
// REGISTER
// ======================================================

router.post(
  '/register',

  registerRateLimit,

  validate({
    body:
      registerSchema
  }),

  async (
    req,
    res
  ) => {

    try {

      let {
        username,
        password
      } = req.body;

      username =
        username.trim();

      // ======================================================
      // EXISTS
      // ======================================================

      const exists =
        await User.findOne(

          {
            username
          },

          '_id'
        ).lean();

      if (exists) {

        return res.status(400).json({

          error:
            'Username already exists'
        });
      }

      // ======================================================
      // AGE VALIDATION
      // ======================================================

      const age =
        req.body.age
          ? Number(req.body.age)
          : undefined;

      const dob =
        req.body.dob
          ? new Date(req.body.dob)
          : undefined;

      const ageValidation =
        validateAgeGate({

          age,
          dob
        });

      if (
        ageValidation.error
      ) {

        return res.status(400).json({

          error:
            ageValidation.error
        });
      }

      // ======================================================
      // HASH PASSWORD
      // ======================================================

      const hashedPassword =
        await bcrypt.hash(
          password,
          8
        );

      // ======================================================
      // PROFILE PIC
      // ======================================================

      let profilePic =
        '';

      if (
        req.body.profilePic &&
        typeof req.body.profilePic ===
          'string'
      ) {

        // Prevent RAM abuse
        if (
          req.body.profilePic.length >
          5 * 1024 * 1024
        ) {

          return res.status(400).json({

            error:
              'Image too large'
          });
        }

        profilePic =
          req.body.profilePic;
      }

      // ======================================================
      // CREATE USER
      // ======================================================

      const user =
        await User.create({

          username,

          password:
            hashedPassword,

          fullName:
            req.body.fullName,

          age:
            ageValidation.age,

          dob,

          gender:
            req.body.gender,

          location:
            req.body.location,

          locationCoordinates: 
            req.body.lat && req.body.lng
              ? {
                  type: 'Point',
                  coordinates: [
                    Number(req.body.lng),
                    Number(req.body.lat)
                  ]
                }
              : { type: 'Point', coordinates: [0, 0] },

          interests:
            Array.isArray(
              req.body.interests
            )

              ? req.body.interests

              : [],

          bio:
            req.body.bio,

          profilePic,

          isProfileComplete:
            Boolean(

              req.body.fullName &&

              ageValidation.age &&

              req.body.gender &&

              req.body.location &&

              (
                req.body.interests
                  ?.length || 0
              ) >= 3
            )
        });

      // ======================================================
      // ACTIVITY
      // ======================================================

      logActivity({

        userId:
          user._id,

        action:
          'registration',

        req,

        metadata: {

          username:
            user.username
        }

      }).catch(() => {});

      const token =
        await generateTokens(
          user,
          res
        );

      res.status(201).json({

        token,

        user: {

          id:
            user._id,

          username:
            user.username,

          fullName:
            user.fullName,

          profilePic:
            user.profilePic,

          age:
            user.age,

          gender:
            user.gender,

          interests:
            user.interests,

          bio:
            user.bio,

          location:
            user.location,

          locationCoordinates:
            user.locationCoordinates,

          isProfileComplete:
            user.isProfileComplete
        }
      });

    } catch (error) {

      console.error(
        '[REGISTER ERROR]:',
        error
      );

      // Duplicate protection
      if (
        error.code === 11000
      ) {

        return res.status(400).json({

          error:
            'Username already exists'
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
// COMPLETE PROFILE
// ======================================================

router.post(
  '/complete-profile',

  auth,

  validate({
    body:
      completeProfileSchema
  }),

  async (
    req,
    res
  ) => {

    try {

      const updates = {};
      const allowedFields = [
        'fullName',
        'age',
        'dob',
        'gender',
        'location',
        'interests',
        'bio',
        'profilePic'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // Handle coordinates
      if (req.body.lat && req.body.lng) {
        updates.locationCoordinates = {
          type: 'Point',
          coordinates: [
            Number(req.body.lng),
            Number(req.body.lat)
          ]
        };
      }

      // Check if profile is now complete
      const existingUser = await User.findById(req.userId).lean();
      const mergedUser = { ...existingUser, ...updates };

      const requiredFields = [
        'fullName',
        'age',
        'gender',
        'location',
        'profilePic'
      ];

      const isComplete = requiredFields.every(field => !!mergedUser[field]);
      updates.isProfileComplete = isComplete;

      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user
      });

    } catch (error) {
      console.error('[COMPLETE PROFILE ERROR]:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);



// ======================================================
// REFRESH TOKEN (OPTIMIZED)
// ======================================================
router.post(
  '/refresh-token',
  async (req, res) => {
    const label = `refresh_${Date.now()}`;
    console.log(`[Auth] Refresh attempt - Cookies:`, req.cookies);
    
    console.time(label);
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        console.warn('[Auth] Refresh failed: No refresh token in cookies');
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      console.log('[Auth] Refresh token found, length:', refreshToken.length);

      // 1. Verify JWT (Synchronous)
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        console.log('[Auth] Refresh token verified for user:', decoded.id);
      } catch (err) {
        console.error('[Auth] JWT verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      // 2. Load user using the NEW index: { "refreshTokens.token": 1 }
      const user = await User.findOne(
        { 
          _id: decoded.id, 
          "refreshTokens.token": refreshToken 
        },
        "_id username"
      ).lean();

      if (!user) {
        console.warn('[Auth] User not found or token not in database for user:', decoded.id);
        return res.status(401).json({ error: 'Token is no longer valid or user not found' });
      }

      // 3. Rotate tokens
      const accessToken = await generateTokens(user, res);
      console.log('[Auth] Tokens rotated successfully for:', user.username);

      console.timeEnd(label);
      res.json({ token: accessToken });

    } catch (error) {
      console.error('[REFRESH TOKEN ERROR]:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);



// ======================================================
// LOGIN
// ======================================================

router.post(
  '/login',

  loginRateLimit,

  validate({
    body:
      loginSchema
  }),

  async (
    req,
    res
  ) => {

    try {

      let {
        username,
        password
      } = req.body;

      username =
        username.trim();

      // ======================================================
      // LOAD USER
      // ======================================================

      const user =
        await User.findOne(

          {
            username
          }
        ).select(`

          password
          username
          role
          status
          profilePic
          fullName
          age
          dob
          gender
          location
          interests
          bio
          settings
          isProfileComplete
          refreshTokens
        `); // Not using lean() here because we need methods/save()

      if (!user) {

        return res.status(401).json({

          error:
            'Invalid credentials'
        });
      }

      // ======================================================
      // ACCOUNT STATUS
      // ======================================================

      if (
        user.status !==
        'active'
      ) {

        return res.status(403).json({

          error:
            `Account ${user.status}`
        });
      }

      // ======================================================
      // PASSWORD
      // ======================================================

      if (user.isLocked) {

        return res.status(403).json({

          error:
            'Account is temporarily locked. Please try again later.'
        });
      }

      const match =
        await bcrypt.compare(

          password,

          user.password
        );

      if (!match) {

        await user.incLoginAttempts();

        return res.status(401).json({

          error:
            'Invalid credentials'
        });
      }

      // ======================================================
      // RESET ATTEMPTS
      // ======================================================

      if (
        user.loginAttempts > 0 ||
        user.lockUntil
      ) {

        await User.updateOne(
          {
            _id: user._id
          },
          {
            $set: {
              loginAttempts: 0
            },

            $unset: {
              lockUntil: 1
            }
          }
        );
      }

      // ======================================================
      // LAST LOGIN
      // ======================================================

      user.lastLogin =
        new Date();

      await user.save();

      const token =
        await generateTokens(
          user,
          res
        );

      // ======================================================
      // ACTIVITY
      // ======================================================

      logActivity({

        userId:
          user._id,

        action:
          'login',

        req

      }).catch(() => {});

      res.json({

        token,

        user: {

          id:
            user._id,

          username:
            user.username,

          role:
            user.role,

          fullName:
            user.fullName,

          profilePic:
            user.profilePic,

          age:
            user.age,

          dob:
            user.dob,

          gender:
            user.gender,

          location:
            user.location,

          locationCoordinates:
            user.locationCoordinates,

          interests:
            user.interests,

          bio:
            user.bio,

          settings:
            user.settings,

          isProfileComplete:
            user.isProfileComplete
        }
      });

    } catch (error) {

      console.error(
        '[LOGIN ERROR]:',
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