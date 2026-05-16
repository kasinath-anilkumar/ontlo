const mongoose = require('mongoose');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000;

const UserSchema = new mongoose.Schema(
  {
    // ======================================================
    // BASIC AUTH
    // ======================================================

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      index: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    // ======================================================
    // PROFILE
    // ======================================================

    profilePic: {
      type: String,
      default: ''
    },

    fullName: {
      type: String,
      trim: true,
      maxlength: 80
    },

    age: {
      type: Number,
      min: 18,
      max: 100
    },

    dob: Date,

    gender: {
      type: String,
      enum: [
        'Male',
        'Female',
        'Other',
        'Prefer not to say'
      ]
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500
    },

    location: {
      type: String,
      trim: true,
      maxlength: 100
    },

    // ======================================================
    // GEO LOCATION
    // ======================================================

    locationCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },

      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },

    // ======================================================
    // INTERESTS
    // ======================================================

    interests: {
      type: [String],
      default: []
    },

    // ======================================================
    // PROFILE STATUS
    // ======================================================

    isProfileComplete: {
      type: Boolean,
      default: false
    },

    // ======================================================
    // ONLINE STATUS
    // ======================================================

    onlineStatus: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline'
    },

    lastSeen: {
      type: Date,
      default: null
    },

    // ======================================================
    // BLOCKED USERS
    // ======================================================

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // ======================================================
    // ROLE & STATUS
    // ======================================================

    role: {
      type: String,
      enum: [
        'user',
        'moderator',
        'admin',
        'superadmin'
      ],
      default: 'user'
    },

    status: {
      type: String,
      enum: [
        'active',
        'suspended',
        'banned'
      ],
      default: 'active'
    },

    isShadowBanned: {
      type: Boolean,
      default: false
    },

    // ======================================================
    // SECURITY
    // ======================================================

    lastLogin: {
      type: Date,
      default: Date.now
    },

    lastIp: {
      type: String,
      default: ''
    },

    loginAttempts: {
      type: Number,
      default: 0
    },

    lockUntil: Number,

    // ======================================================
    // VERIFICATION
    // ======================================================

    isVerified: {
      type: Boolean,
      default: false
    },

    // ======================================================
    // PREMIUM
    // ======================================================

    isPremium: {
      type: Boolean,
      default: false
    },

    premiumExpiresAt: Date,

    boosts: {
      type: Number,
      default: 0
    },

    lastBoostedAt: Date,

    // ======================================================
    // REFERRALS
    // ======================================================

    referralCode: {
      type: String,
      unique: true,
      sparse: true
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // ======================================================
    // SETTINGS
    // ======================================================

    settings: {
      emailNotifications: {
        type: Boolean,
        default: true
      },

      discoveryMode: {
        type: Boolean,
        default: true
      },

      stealthMode: {
        type: Boolean,
        default: false
      },

      language: {
        type: String,
        default: 'en'
      }
    },

    // ======================================================
    // NOTIFICATION PREFERENCES
    // ======================================================

    notificationPreferences: {
      messages: {
        type: Boolean,
        default: true
      },

      matches: {
        type: Boolean,
        default: true
      },

      calls: {
        type: Boolean,
        default: true
      },

      marketing: {
        type: Boolean,
        default: false
      }
    },

    // ======================================================
    // MATCH PREFERENCES
    // ======================================================

    matchPreferences: {
      gender: {
        type: String,
        enum: [
          'Male',
          'Female',
          'Other',
          'All'
        ],
        default: 'All'
      },

      ageRange: {
        min: {
          type: Number,
          default: 18
        },

        max: {
          type: Number,
          default: 100
        }
      },

      distance: {
        type: Number,
        default: 500
      },

      interests: {
        type: [String],
        default: []
      }
    },

    // ======================================================
    // TOKENS
    // ======================================================

    refreshTokens: {
      type: [
        {
          token: String,

          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      select: false
    },

    // ======================================================
    // FAVORITES
    // ======================================================

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // ======================================================
    // COUNTERS
    // ======================================================

    notificationCount: {
      type: Number,
      default: 0
    },

    profileViews: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);



// ======================================================
// INDEXES
// ======================================================

UserSchema.index({
  role: 1
});

UserSchema.index({
  isPremium: 1
});

UserSchema.index({
  onlineStatus: 1
});

UserSchema.index({
  onlineStatus: 1,
  role: 1
});

UserSchema.index({
  status: 1,
  onlineStatus: 1
});

UserSchema.index({
  interests: 1
});

UserSchema.index({
  interests: 1,
  onlineStatus: 1
});

UserSchema.index({
  createdAt: -1
});

UserSchema.index({
  locationCoordinates: '2dsphere'
}, { background: true });

// Optimized Refresh Token Lookup
UserSchema.index({
  "refreshTokens.token": 1
}, { background: true });



// ======================================================
// VIRTUALS
// ======================================================

UserSchema.virtual('isLocked').get(function () {

  return !!(
    this.lockUntil &&
    this.lockUntil > Date.now()
  );
});



// ======================================================
// LOGIN ATTEMPTS
// ======================================================

UserSchema.methods.incLoginAttempts =
  function () {

    if (
      this.lockUntil &&
      this.lockUntil < Date.now()
    ) {

      return this.updateOne({
        $set: {
          loginAttempts: 1
        },

        $unset: {
          lockUntil: 1
        }
      });
    }

    const updates = {
      $inc: {
        loginAttempts: 1
      }
    };

    if (
      this.loginAttempts + 1 >=
        MAX_LOGIN_ATTEMPTS &&
      !this.isLocked
    ) {

      updates.$set = {
        lockUntil:
          Date.now() + LOCK_TIME
      };
    }

    return this.updateOne(updates);
  };



module.exports = mongoose.model(
  'User',
  UserSchema
);