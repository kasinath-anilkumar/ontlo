const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Like = require('../models/Like');
const auth = require('../middleware/auth');

// --- LIKES ---

// Get users who liked the current user
router.get('/received', auth, async (req, res) => {
  try {
    const likes = await Like.find({ toUser: req.user.id })
      .populate('fromUser', 'username profilePic age gender bio isPremium')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(likes);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a user
router.post('/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    if (targetUserId === req.user.id) return res.status(400).json({ error: 'Cannot like yourself' });

    const existingLike = await Like.findOne({ fromUser: req.user.id, toUser: targetUserId });
    if (existingLike) return res.status(400).json({ error: 'Already liked' });

    const newLike = new Like({ fromUser: req.user.id, toUser: targetUserId });
    await newLike.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- FAVORITES ---

// Get current user's favorites
router.get('/favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('favorites', 'username profilePic age gender bio onlineStatus')
      .select('favorites')
      .lean();
    res.json(user?.favorites || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle favorite
router.post('/favorites/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const targetOid = new mongoose.Types.ObjectId(targetUserId);
    const index = user.favorites.findIndex((id) => id.toString() === targetUserId);
    if (index > -1) {
      user.favorites.splice(index, 1);
    } else {
      user.favorites.push(targetOid);
    }
    
    await user.save();
    res.json({ success: true, isFavorite: index === -1 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
