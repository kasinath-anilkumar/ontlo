const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  }
}, { timestamps: true });

// Ensure unique pairs
ConnectionSchema.index({ users: 1 }, { unique: true });

module.exports = mongoose.model('Connection', ConnectionSchema);
