const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure a user can only like another user once
LikeSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);
