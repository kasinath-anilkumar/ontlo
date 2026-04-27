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
  aiConfidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  aiSummary: String,
  moderatorNote: String
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
