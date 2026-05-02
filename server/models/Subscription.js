const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['premium_monthly', 'premium_yearly', 'boost_pack_5', 'boost_pack_10'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'pending'
  },
  amount: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  paymentId: String, // From payment gateway
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date
}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
