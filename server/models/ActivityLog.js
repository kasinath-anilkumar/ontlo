const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['login', 'logout', 'profile_update', 'password_change', 'report_filed', 'suspicious_activity'],
    required: true
  },
  ip: String,
  userAgent: String,
  deviceType: String,
  location: {
    city: String,
    country: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
