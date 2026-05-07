const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    // ======================================================
    // CONNECTION
    // ======================================================

    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Connection',
      required: true
    },

    // ======================================================
    // SENDER
    // ======================================================

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ======================================================
    // EMBEDDED SENDER SNAPSHOT
    // Avoid populate()
    // ======================================================

    senderInfo: {
      _id: mongoose.Schema.Types.ObjectId,

      username: {
        type: String,
        trim: true
      },

      profilePic: {
        type: String,
        default: ''
      }
    },

    // ======================================================
    // TEXT MESSAGE
    // ======================================================

    text: {
      type: String,

      trim: true,

      maxlength: 5000,

      required: function () {
        return !this.imageUrl;
      }
    },

    // ======================================================
    // IMAGE
    // ======================================================

    imageUrl: {
      type: String,
      default: null
    },

    // ======================================================
    // READ STATUS
    // ======================================================

    isRead: {
      type: Boolean,
      default: false
    },

    readAt: {
      type: Date,
      default: null
    },

    // ======================================================
    // OPTIONAL SOFT DELETE
    // ======================================================

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]

  },
  {
    timestamps: true
  }
);



// ======================================================
// INDEXES
// ======================================================

// Chat history
MessageSchema.index({
  connectionId: 1,
  createdAt: 1
});

// Unread messages
MessageSchema.index({
  connectionId: 1,
  isRead: 1
});

// Sender messages
MessageSchema.index({
  sender: 1
});

// Recent messages
MessageSchema.index({
  createdAt: -1
});



// ======================================================
// VALIDATION
// ======================================================

MessageSchema.pre('validate', async function () {

  // Require text or image
  if (
    (!this.text || !this.text.trim()) &&
    !this.imageUrl
  ) {
    throw new Error('Message text or image required');
  }
});



module.exports = mongoose.model(
  'Message',
  MessageSchema
);