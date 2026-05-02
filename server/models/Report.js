const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  roomId: String,
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  moderatorAction: {
    type: String,
    enum: ['none', 'warning', 'suspended', 'banned'],
    default: 'none'
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  aiSummary: String,
  moderatorNote: String
}, { timestamps: true });

ReportSchema.statics.getRepeatOffenderStats = async function(userId) {
  const count = await this.countDocuments({ reportedUser: userId, status: 'resolved' });
  const pendingCount = await this.countDocuments({ reportedUser: userId, status: 'pending' });
  return { resolvedReports: count, pendingReports: pendingCount };
};

ReportSchema.index({ reportedUser: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ severity: 1 });
ReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
