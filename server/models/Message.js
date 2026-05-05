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

  // 🔥 OPTIONAL (keep — good for avoiding joins)
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

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });


// 🔥 INDEXES (MATCH YOUR QUERIES)
MessageSchema.index({ connectionId: 1, createdAt: 1 });  // chat history
MessageSchema.index({ connectionId: 1, isRead: 1 });     // unread
MessageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', MessageSchema);