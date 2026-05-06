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

  secure:
    process.env.NODE_ENV ===
    'production',

  sameSite:
    process.env.NODE_ENV ===
    'production'

      ? 'none'

      : 'lax'
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

        maxAge:
          7 *
          24 *
          60 *
          60 *
          1000
      }
    );

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

  async (
    req,
    res
  ) => {

    try {

      const user =
        await User.findById(

          req.userId,

          `
          -password
          -refreshTokens
          `
        ).lean();

      if (!user) {

        return res.status(404).json({

          error:
            'User not found'
        });
      }

      res.json(user);

    } catch (error) {

      res.status(500).json({

        error:
          'Server error'
      });
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

          coordinates:

            req.body.lat &&
            req.body.lng

              ? {

                  lat:
                    Number(req.body.lat),

                  lng:
                    Number(req.body.lng)
                }

              : undefined,

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
        `);

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