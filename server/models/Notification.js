const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['like', 'message', 'announcement', 'system', 'match', 'alert', 'info'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedId: {
    type: String // ConnectionId, MessageId, etc.
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

NotificationSchema.index({ user: 1, isRead: 1 }); // Optimized for countDocuments query
NotificationSchema.index({ user: 1, createdAt: -1 }); // List + sort by user (replaces global createdAt-only for this use case)

module.exports = mongoose.model('Notification', NotificationSchema);
