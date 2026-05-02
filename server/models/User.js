const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePic: {
    type: String,
    default: 'https://i.pravatar.cc/150'
  },
  // Profile fields
  fullName: String,
  age: Number,
  dob: Date,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  location: String,
  interests: [String],
  bio: String,
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  onlineStatus: {
    type: Boolean,
    default: false
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'superadmin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isShadowBanned: {
    type: Boolean,
    default: false
  },
  lastIp: String,
  settings: {
    emailNotifications: { type: Boolean, default: true },
    discoveryMode: { type: Boolean, default: true },
    stealthMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' }
  },
  refreshTokens: [String],
  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockUntil: {
    type: Number
  },
  skipCount: {
    type: Number,
    default: 0
  },
  lastSkipAt: {
    type: Date
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiresAt: {
    type: Date
  },
  boosts: {
    type: Number,
    default: 0
  },
  lastBoostedAt: {
    type: Date
  },
  region: {
    type: String,
    default: 'Global'
  },
  lowBandwidth: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

UserSchema.index({ role: 1 });
UserSchema.index({ isPremium: 1 });
UserSchema.index({ onlineStatus: 1 });

UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise we're incrementing
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if we've reached max attempts and it's not already locked
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  
  return this.updateOne(updates);
};

module.exports = mongoose.model('User', UserSchema);
