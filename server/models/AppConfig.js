const mongoose = require('mongoose');

const AppConfigSchema = new mongoose.Schema({
  // Matchmaking
  radius: { type: Number, default: 50 },
  ageGap: { type: Number, default: 5 },
  boostPremium: { type: Boolean, default: true },
  
  // Safety
  bannedKeywords: { type: [String], default: [] },
  autoModerate: { type: Boolean, default: true },
  safetyBlurDuration: { type: Number, default: 3 }, // In seconds
  
  // Platform Limits
  dailyMessageLimit: { type: Number, default: 50 },
  bioMaxLength: { type: Number, default: 150 },
  
  // System
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: 'Ontlo is currently undergoing scheduled maintenance. Please check back later.' },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', AppConfigSchema);
