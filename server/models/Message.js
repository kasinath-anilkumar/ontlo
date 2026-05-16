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

// 1. Optimized Chat history (Matching the sort order in routes)
MessageSchema.index({
  connectionId: 1,
  createdAt: -1
}, { background: true });

// 2. Optimized Mark-as-read (Targeted update)
MessageSchema.index({
  connectionId: 1,
  sender: 1,
  isRead: 1
}, { background: true });

// 3. Optimized Soft delete filtering
MessageSchema.index({
  connectionId: 1,
  deletedFor: 1
}, { background: true });

// 4. Global Recent messages
MessageSchema.index({
  createdAt: -1
}, { background: true });

// 5. Sender tracking
MessageSchema.index({
  sender: 1,
  createdAt: -1
}, { background: true });

// 6. Fast unread lookup per user and connection (for counts)
MessageSchema.index({
  connectionId: 1,
  isRead: 1,
  sender: 1
}, { background: true });





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