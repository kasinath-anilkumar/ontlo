const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Get current billing status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('isPremium premiumExpiresAt boosts');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mock purchase premium
router.post('/upgrade', auth, async (req, res) => {
  try {
    const { plan } = req.body; // e.g. 'premium_monthly'
    const duration = plan === 'premium_yearly' ? 365 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const user = await User.findByIdAndUpdate(req.userId, {
      isPremium: true,
      premiumExpiresAt: expiresAt
    }, { new: true });

    const subscription = new Subscription({
      user: req.userId,
      plan,
      status: 'active',
      amount: plan === 'premium_yearly' ? 99 : 9.99,
      endDate: expiresAt
    });
    await subscription.save();

    await logActivity({
      userId: req.userId,
      action: 'admin_action', // Or add a 'purchase' action
      req,
      metadata: { plan, expiresAt }
    });

    res.json({ message: 'Upgraded to Premium successfully!', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mock purchase boosts
router.post('/buy-boosts', auth, async (req, res) => {
  try {
    const { pack } = req.body; // e.g. 'boost_pack_5'
    const count = pack === 'boost_pack_10' ? 10 : 5;

    const user = await User.findByIdAndUpdate(req.userId, {
      $inc: { boosts: count }
    }, { new: true });

    const subscription = new Subscription({
      user: req.userId,
      plan: pack,
      status: 'active',
      amount: pack === 'boost_pack_10' ? 15 : 8
    });
    await subscription.save();

    await logActivity({
      userId: req.userId,
      action: 'admin_action',
      req,
      metadata: { pack, count }
    });

    res.json({ message: `Purchased ${count} boosts successfully!`, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Use a boost
router.post('/boost', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.boosts <= 0) {
      return res.status(400).json({ error: 'No boosts available' });
    }

    user.boosts -= 1;
    user.lastBoostedAt = new Date();
    await user.save();

    await logActivity({
      userId: req.userId,
      action: 'profile_update',
      req,
      metadata: { detail: 'User used a profile boost' }
    });

    res.json({ message: 'Profile boosted! You will be prioritized in matching for the next hour.', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
