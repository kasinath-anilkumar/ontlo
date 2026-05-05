// models/Notification.js

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
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

  // 🔥 EMBEDDED USER DATA (NO JOIN NEEDED)
  fromUser: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: {
      type: String
    },
    profilePic: {
      type: String
    }
  },

  relatedId: {
    type: String
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });


// 🔥 INDEXES (IMPORTANT)
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);