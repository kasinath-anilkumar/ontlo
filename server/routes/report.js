const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Submit a report
router.post('/', authenticate, async (req, res) => {
  try {
    const { reportedUserId, reason, roomId } = req.body;
    
    const newReport = new Report({
      reporter: req.userId,
      reportedUser: reportedUserId,
      reason,
      roomId
    });
    
    await newReport.save();
    
    // Notify admins in real-time
    if (req.io) {
      req.io.emit('support-update-admin', { type: 'report' });
    }
    
    res.status(201).json({ message: 'Report submitted successfully. We will review it shortly.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my reports
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.userId })
      .populate('reportedUser', 'username profilePic fullName')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a report
router.put('/:id', authenticate, async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, reporter: req.userId });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    report.reason = req.body.reason || report.reason;
    await report.save();
    
    res.json({ message: 'Report updated successfully', report });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
