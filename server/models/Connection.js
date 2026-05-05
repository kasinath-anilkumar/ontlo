// models/Connection.js

const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

  // 🔥 STORE LAST MESSAGE (NO AGGREGATION)
  lastMessage: {
    text: String,
    createdAt: Date
  }

}, { timestamps: true });


// 🔥 INDEXES
ConnectionSchema.index({ users: 1, status: 1 });
ConnectionSchema.index({ users: 1, updatedAt: -1 });

module.exports = mongoose.model('Connection', ConnectionSchema);