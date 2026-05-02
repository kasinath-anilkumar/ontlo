const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const validate = require('../middleware/validate');
const {
  createTicketSchema,
  replyTicketSchema,
  updateStatusSchema,
  ticketIdParamSchema,
} = require('../validators/support.validator');
const SupportTicket = require('../models/SupportTicket');
const { logActivity } = require('../utils/logger');

// USER: Create a ticket
router.post('/create', auth, validate({ body: createTicketSchema }), async (req, res) => {
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

    await logActivity({
      userId: req.user.id,
      action: 'ticket_created',
      req,
      metadata: { ticketId: ticket._id }
    });
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
router.get('/all', adminAuth(['admin', 'superadmin', 'moderator']), async (req, res) => {
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
router.post('/reply/:id', adminAuth(['admin', 'superadmin', 'moderator']), validate({ params: ticketIdParamSchema, body: replyTicketSchema }), async (req, res) => {
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

    await logActivity({
      userId: req.user.id,
      action: 'ticket_replied',
      req,
      metadata: { ticketId: ticket._id }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN: Update status
router.patch('/status/:id', adminAuth(['admin', 'superadmin', 'moderator']), validate({ params: ticketIdParamSchema, body: updateStatusSchema }), async (req, res) => {
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

    await logActivity({
      userId: req.user.id,
      action: 'ticket_status_change',
      req,
      metadata: { ticketId: ticket._id, status }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
