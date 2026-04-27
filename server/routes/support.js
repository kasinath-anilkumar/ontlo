const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');

// USER: Create a ticket
router.post('/create', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const ticket = new SupportTicket({
      user: req.user.id,
      subject,
      message
    });
    await ticket.save();

    // Notify admins in real-time
    req.io.emit('support-update-admin');
    
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// USER: Get my tickets
router.get('/my-tickets', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: Get all tickets
router.get('/all', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'username profilePic')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: Reply to ticket
router.post('/reply/:id', auth, async (req, res) => {
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

    // Notify user in real-time
    req.io.to(`user_${ticket.user}`).emit('support-update');

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: Update status
router.patch('/status/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // Notify user in real-time
    req.io.to(`user_${ticket.user}`).emit('support-update');

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
