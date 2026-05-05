// models/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // 🔥 OPTIONAL: embed sender info (same idea as notifications)
  senderInfo: {
    _id: mongoose.Schema.Types.ObjectId,
    username: String,
    profilePic: String
  },

  text: {
    type: String,
    required: function () {
      return !this.imageUrl;
    }
  },

  imageUrl: {
    type: String
  },

  timestamp: {
    type: Date,
    default: Date.now
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });


// 🔥 INDEXES (optimized for your queries)
MessageSchema.index({ connectionId: 1, timestamp: 1 });     // chat history
MessageSchema.index({ connectionId: 1, isRead: 1 });        // unread in chat
MessageSchema.index({ sender: 1 });                         // sender lookup

module.exports = mongoose.model('Message', MessageSchema);