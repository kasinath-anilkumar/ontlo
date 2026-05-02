const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { 
  submitReportSchema, 
  updateReportSchema, 
  reportIdParamSchema 
} = require('../validators/report.validator');
const { logActivity } = require('../utils/logger');
const { checkUserBehavior } = require('../utils/abuseDetector');

// Submit a report
router.post('/', auth, validate({ body: submitReportSchema }), async (req, res) => {
  try {
    const { reportedUserId, reason, roomId, severity } = req.body;
    
    const newReport = new Report({
      reporter: req.userId,
      reportedUser: reportedUserId,
      reason,
      severity: severity || 'low',
      roomId
    });
    
    await newReport.save();

    await logActivity({
      userId: req.userId,
      action: 'report_filed',
      req,
      metadata: { 
        reportedUserId, 
        reportId: newReport._id,
        severity: newReport.severity 
      }
    });
    
    // Notify admins in real-time
    if (req.io) {
      req.io.emit('support-update-admin', { type: 'report' });
      // Trigger abuse detection on the reported user
      checkUserBehavior(reportedUserId, req.io);
    }
    
    res.status(201).json({ message: 'Report submitted successfully. We will review it shortly.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my reports
router.get('/my-reports', auth, async (req, res) => {
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
router.put('/:id', auth, validate({ params: reportIdParamSchema, body: updateReportSchema }), async (req, res) => {
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
