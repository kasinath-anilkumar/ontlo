const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
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
  }]
}, { timestamps: true });

UserSchema.index({ onlineStatus: 1 });

module.exports = mongoose.model('User', UserSchema);
