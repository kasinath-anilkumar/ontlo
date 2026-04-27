const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['announcement', 'alert', 'info'],
    default: 'announcement'
  },
  targetCriteria: {
    role: String,
    gender: String,
    minAge: Number,
    maxAge: Number,
    location: String
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stats: {
    deliveredCount: { type: Number, default: 0 },
    clickedCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
