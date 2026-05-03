const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'login', 
      'logout', 
      'profile_update', 
      'password_change', 
      'report_filed', 
      'suspicious_activity', 
      'admin_action', 
      'config_update', 
      'broadcast_sent',
      'registration',
      'export_data',
      'account_deletion',
      'role_change',
      'status_change',
      'user_block',
      'user_unblock',
      'ticket_created',
      'ticket_replied',
      'ticket_status_change'
    ],
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

ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
