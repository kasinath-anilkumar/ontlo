const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Connection',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: function() { return !this.imageUrl; }
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

MessageSchema.index({ connectionId: 1, timestamp: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ isRead: 1, sender: 1 }); // Optimized for unread counts query
MessageSchema.index({ connectionId: 1, isRead: 1 }); // Optimized for chat-specific unread counts

module.exports = mongoose.model('Message', MessageSchema);
