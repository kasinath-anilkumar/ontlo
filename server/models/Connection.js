// models/Connection.js

const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  ],

  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },

  // 🔥 EMBED USER DATA (NO LOOKUP)
  userDetails: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      username: String,
      profilePic: String,
      onlineStatus: String
    }
  ],

  // 🔥 STORE LAST MESSAGE
  lastMessage: {
    text: String,
    createdAt: Date
  }

}, { timestamps: true });


// 🔥 INDEXES (CRITICAL)
ConnectionSchema.index({ users: 1, updatedAt: -1 });
ConnectionSchema.index({ users: 1, status: 1 });

// 🔥 PREVENT DUPLICATE CONNECTIONS
ConnectionSchema.index({ users: 1 }, { unique: true });

module.exports = mongoose.model('Connection', ConnectionSchema);