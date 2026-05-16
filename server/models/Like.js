const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema(
  {
    // ======================================================
    // FROM USER
    // ======================================================

    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ======================================================
    // TO USER
    // ======================================================

    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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
    // OPTIONAL MATCH FLAG
    // ======================================================

    isMatch: {
      type: Boolean,
      default: false
    }

  },
  {
    timestamps: true
  }
);



// ======================================================
// UNIQUE LIKE
// Prevent duplicate likes
// ======================================================

LikeSchema.index(
  {
    fromUser: 1,
    toUser: 1
  },
  {
    unique: true
  }
);



// ======================================================
// MATCH LOOKUP
// ======================================================

LikeSchema.index({
  toUser: 1,
  fromUser: 1
});



// ======================================================
// UNREAD LIKES
// ======================================================

LikeSchema.index({
  toUser: 1,
  isRead: 1
});



// ======================================================
// RECENT LIKES
// ======================================================

LikeSchema.index({
  createdAt: -1
}, { background: true });

// Optimized Pending Requests Fetch
LikeSchema.index({
  toUser: 1,
  createdAt: -1
}, { background: true });



// ======================================================
// VALIDATION
// ======================================================

LikeSchema.pre('validate', function (next) {

  // Prevent self-like
  if (
    this.fromUser &&
    this.toUser &&
    this.fromUser.toString() ===
      this.toUser.toString()
  ) {

    return next(
      new Error(
        'Users cannot like themselves'
      )
    );
  }

  next();
});



module.exports = mongoose.model(
  'Like',
  LikeSchema
);