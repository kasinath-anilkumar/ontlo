const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },

    type: {
      type: String,
      enum: [
        'like',
        'message',
        'announcement',
        'system',
        'match',
        'ping',
        'alert',
        'info'
      ],
      required: true
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    // 🔥 EMBEDDED USER SNAPSHOT
    // Avoid populate/join on notification fetch
    fromUser: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },

      username: {
        type: String,
        trim: true
      },

      profilePic: {
        type: String,
        default: ''
      }
    },

    // Related entity (message/match/etc)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId
    },

    isRead: {
      type: Boolean,
      default: false
    },

    readAt: {
      type: Date,
      default: null
    },

    // 🔥 AUTO DELETE AFTER 30 DAYS
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  },
  {
    timestamps: true
  }
);



// ======================================================
// 🔥 INDEXES
// ======================================================

// Main notification fetch (Heavily used for dashboard)
NotificationSchema.index({
  user: 1,
  createdAt: -1
}, { background: true });

// Unread status sorting
NotificationSchema.index({
  isRead: 1,
  updatedAt: -1
}, { background: true });

// Faster unread counts
NotificationSchema.index({
  user: 1,
  isRead: 1
}, { background: true });

// Type filtering
NotificationSchema.index({
  user: 1,
  type: 1
}, { background: true });

// TTL cleanup
NotificationSchema.index(
  {
    expiresAt: 1
  },
  {
    expireAfterSeconds: 0,
    background: true
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);
