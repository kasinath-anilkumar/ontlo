const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Report = require('../models/Report');
const Connection = require('../models/Connection');
const Message = require('../models/Message');
const adminAuth = require('../middleware/adminAuth');
const ActivityLog = require('../models/ActivityLog');

// Dashboard Overview Stats
router.get('/stats', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ onlineStatus: true });
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const totalConnections = await Connection.countDocuments();
    
    // Growth metrics
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const beforeLast24h = new Date(now - 48 * 60 * 60 * 1000);

    const newUsers24h = await User.countDocuments({ createdAt: { $gte: last24h } });
    const prevUsers24h = await User.countDocuments({ 
      createdAt: { $gte: beforeLast24h, $lt: last24h } 
    });

    // Calculate growth percentage
    let growthRate = 0;
    if (prevUsers24h > 0) {
      growthRate = ((newUsers24h - prevUsers24h) / prevUsers24h) * 100;
    } else if (newUsers24h > 0) {
      growthRate = 100;
    }

    // Match Success Rate (Connections per user average)
    const matchSuccess = totalUsers > 0 ? (totalConnections / (totalUsers / 2)) * 100 : 0;

    // Generate 7-day registration history for charts
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      
      const count = await User.countDocuments({ 
        createdAt: { $gte: startOfDay, $lte: endOfDay } 
      });
      
      chartData.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        users: count
      });
    }

    const dau = await ActivityLog.distinct('userId', { createdAt: { $gte: last24h } });
    const mau = await ActivityLog.distinct('userId', { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } });

    res.json({
      overview: {
        totalUsers,
        onlineUsers,
        pendingReports,
        matchSuccess: Math.min(Math.round(matchSuccess), 100),
        growthRate: Math.round(growthRate),
        dau: dau.length,
        mau: mau.length
      },
      growth: {
        newUsers24h,
        totalConnections,
        chartData
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ... (existing users and reports routes)

// Safety: View Activity Logs
router.get('/logs', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const { userId, action } = req.query;
    const query = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;

    const logs = await ActivityLog.find(query)
      .populate('userId', 'username profilePic')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Management: List with Search & Pagination
router.get('/users', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalUsers: total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Staff Member (SuperAdmin Only)
router.post('/users/create-staff', adminAuth(['superadmin']), async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    const bcrypt = require('bcrypt');

    // SECURITY: Strong Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(String(password))) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long and include one uppercase letter, one number, and one special character (@$!%*?&#).' 
      });
    }

    // Check if user exists
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ error: 'Username or Email already exists' });

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'moderator',
      status: 'active',
      isVerified: true
    });

    await newUser.save();
    
    // AUDIT LOG
    try {
      await ActivityLog.create({
        userId: req.user._id,
        action: 'admin_action',
        details: `${req.user.username} created a new staff member: ${username} (${role})`,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (e) {}

    res.json({ message: 'Staff member created successfully', user: { username, role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User Status (Ban/Suspend/Verify)
router.post('/users/:id/action', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const { action, status, isVerified } = req.body;
    const update = {};

    if (status) update.status = status;
    if (isVerified !== undefined) update.isVerified = isVerified;

    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const actionLabel = action || status || (isVerified !== undefined ? 'verification_change' : 'unknown');

    // AUDIT LOG: Record this admin action (wrapped in try-catch to prevent 500s)
    try {
      await ActivityLog.create({
        userId: req.user._id,
        action: 'admin_action',
        details: `${req.user.username} performed '${actionLabel}' on user ${user.username}`,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (logError) {
      console.error('Audit Log Error:', logError.message);
      // We don't throw here so the main action still succeeds
    }

    res.json({ message: `Action '${actionLabel}' performed successfully`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderation: List Reports
router.get('/reports', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username profilePic')
      .populate('reportedUser', 'username profilePic status')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderation: Resolve Report
router.post('/moderation/reports/:id/resolve', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const { action } = req.body;
    await Report.findByIdAndUpdate(req.params.id, { 
      status: 'resolved', 
      moderatorNote: `Action taken: ${action} by ${req.user.username}` 
    });

    // AUDIT LOG
    await ActivityLog.create({
      userId: req.user._id,
      action: 'admin_action',
      details: `${req.user.username} resolved report ${req.params.id} with action: ${action}`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Report resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast: Get History
router.get('/broadcasts', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const Announcement = require('../models/Announcement');
    const history = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('content type createdAt stats');
    
    // Format for frontend
    const formatted = history.map(h => ({
      text: h.content,
      type: h.type || 'announcement',
      timestamp: h.createdAt,
      stats: h.stats
    }));
    
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast: Send Announcement
router.post('/broadcast', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const { text, type } = req.body;
    const Announcement = require('../models/Announcement');
    
    // Create record
    const announcement = new Announcement({
      title: type.toUpperCase(),
      content: text,
      type: type,
      sentBy: req.user._id
    });
    
    const usersCount = await User.countDocuments();
    announcement.stats = { deliveredCount: usersCount };
    await announcement.save();

    // Create persistent notifications for ALL users
    const Notification = require('../models/Notification');
    const allUsers = await User.find({}, '_id');
    const notifications = allUsers.map(u => ({
      user: u._id,
      type: type || 'announcement',
      content: text,
      fromUser: req.user._id
    }));
    await Notification.insertMany(notifications);

    // AUDIT LOG
    try {
      await ActivityLog.create({
        userId: req.user._id,
        action: 'admin_action',
        details: `${req.user.username} sent a global ${type} broadcast to ${usersCount} users`,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (e) {}

    // Emit real-time notification update to all connected clients
    if (req.io) {
      req.io.emit('notification-update', { type: 'announcement', content: text });
    }

    res.json({ message: `Announcement sent to ${usersCount} users`, announcement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Config: Manage Banned Keywords
router.post('/config/keywords', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const { keywords } = req.body; // Array of strings
    
    await AppConfig.findOneAndUpdate(
      { key: 'banned_keywords' },
      { value: keywords, updatedBy: req.user._id },
      { upsert: true, new: true }
    );

    // Trigger local cache refresh
    await refreshKeywords();

    res.json({ message: 'Banned keywords updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const SupportTicket = require('../models/SupportTicket');

// Support: List Tickets
router.get('/support', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'username profilePic')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/support/all', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'username profilePic')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/support/reply/:id', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.responses.push({
      admin: req.user.id,
      message
    });
    ticket.status = 'in-progress';
    await ticket.save();

    req.io.to(`user_${ticket.user}`).emit('support-update');

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch('/support/status/:id', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    req.io.to(`user_${ticket.user}`).emit('support-update');

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/support/:id/resolve', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
  try {
    await SupportTicket.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.json({ message: 'Ticket resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Matchmaking: Get/Update Algorithm Settings
router.get('/matchmaking/config', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    let config = await AppConfig.findOne({ key: 'matchmaking_settings' });
    if (!config) {
      config = new AppConfig({
        key: 'matchmaking_settings',
        value: { radius: 50, ageGap: 5, boostPremium: true }
      });
      await config.save();
    }
    res.json(config.value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/matchmaking/config', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const { settings } = req.body;
    await AppConfig.findOneAndUpdate(
      { key: 'matchmaking_settings' },
      { value: settings, updatedBy: req.user._id },
      { upsert: true }
    );
    res.json({ message: 'Algorithm settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Data Management: Export Users CSV
router.get('/export/users', adminAuth(['superadmin']), async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    // Simple CSV conversion
    const headers = 'Username,Full Name,Email,Role,Status,Joined At\n';
    const rows = users.map(u => 
      `${u.username},${u.fullName || ''},${u.email || ''},${u.role},${u.status},${u.createdAt}`
    ).join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment('ontlo_users_export.csv');
    res.send(headers + rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System: Health & Infrastructure
router.get('/system/health', adminAuth(['superadmin']), async (req, res) => {
  try {
    const health = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      userCount: await User.countDocuments(),
      reportCount: await require('../models/Report').countDocuments(),
      nodeVersion: process.version,
      lastAudit: new Date().toISOString(),
      securityStatus: 'Active'
    };
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications: Get real system alerts
router.get('/notifications', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const recentReports = await Report.find({ status: 'pending' })
      .limit(3)
      .populate('reporter', 'username')
      .sort({ createdAt: -1 });

    const alerts = recentReports.map(r => ({
      id: r._id,
      text: `New report from ${r.reporter?.username || 'User'}`,
      time: 'Recent',
      type: 'alert'
    }));

    // Add a system status alert if any
    if (mongoose.connection.readyState !== 1) {
      alerts.push({ id: 'db-down', text: 'Database connection unstable', time: 'Now', type: 'critical' });
    }

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Security: Perform deep system audit
router.post('/audit', adminAuth(['superadmin']), async (req, res) => {
  try {
    const start = Date.now();
    
    // 1. Check for suspicious user activity
    const suspiciousUsers = await User.countDocuments({ status: 'suspended' });
    
    // 2. Test DB Latency
    await User.findOne(); // Small query to test
    const latency = Date.now() - start;

    // 3. Check for report surges
    const recentReports = await Report.countDocuments({ 
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } 
    });

    // 4. Memory Check
    const mem = process.memoryUsage().heapUsed / 1024 / 1024;
    
    const results = {
      timestamp: new Date().toISOString(),
      score: 100 - (suspiciousUsers * 2) - (recentReports > 10 ? 10 : 0),
      latency: `${latency}ms`,
      alerts: [],
      status: 'Healthy'
    };

    if (latency > 500) results.alerts.push('High DB Latency');
    if (mem > 400) results.alerts.push('High Memory Usage');
    if (suspiciousUsers > 10) results.alerts.push('High volume of suspended accounts');

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users: Update user profile
router.post('/users/:id/update', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const { fullName, bio, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { fullName, bio, role } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Config: Get global app settings
router.get('/config', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const AppConfig = require('../models/AppConfig');
    let config = await AppConfig.findOne();
    if (!config) {
      config = await AppConfig.create({});
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Config: Update global settings
router.post('/config/update', adminAuth(['admin', 'superadmin']), async (req, res) => {
  try {
    const AppConfig = require('../models/AppConfig');
    const { refreshKeywords } = require('../utils/moderation');
    
    // We update the single config document
    const config = await AppConfig.findOneAndUpdate({}, { ...req.body, updatedBy: req.user._id }, { 
      returnDocument: 'after', 
      upsert: true 
    });
    
    // Trigger immediate refresh in socket moderation engine if keywords changed
    if (req.body.bannedKeywords) {
      await refreshKeywords();
    }
    
    // AUDIT LOG
    try {
      await ActivityLog.create({
        userId: req.user._id,
        action: 'admin_action',
        details: `${req.user.username} updated global application configuration`,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (logErr) { console.error("Log error:", logErr); }

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
