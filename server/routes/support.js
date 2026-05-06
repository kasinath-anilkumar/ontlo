const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const validate = require('../middleware/validate');

const {
  createTicketSchema,
  replyTicketSchema,
  updateStatusSchema,
  ticketIdParamSchema
} = require('../validators/support.validator');

const SupportTicket =
  require('../models/SupportTicket');

const {
  logActivity
} = require('../utils/logger');



// ======================================================
// USER CREATE TICKET
// ======================================================

router.post(
  '/create',

  auth,

  validate({
    body: createTicketSchema
  }),

  async (req, res) => {

    try {

      const {
        subject,
        message,
        priority
      } = req.body;

      // ======================================================
      // SPAM PROTECTION
      // ======================================================

      const recentTicket =
        await SupportTicket.findOne({

          user: req.user.id,

          createdAt: {
            $gte: new Date(
              Date.now() -
                1000 * 60 * 2
            )
          }
        }).lean();

      if (recentTicket) {

        return res.status(429).json({
          error:
            'Please wait before creating another ticket'
        });
      }

      // ======================================================
      // CREATE
      // ======================================================

      const ticket =
        await SupportTicket.create({

          user: req.user.id,

          subject: subject.trim(),

          message: message.trim(),

          priority:
            priority || 'low'
        });

      // ======================================================
      // REALTIME ADMIN UPDATE
      // ======================================================

      if (req.io) {

        req.io.emit(
          'support-update-admin'
        );
      }

      // ======================================================
      // ACTIVITY LOG
      // ======================================================

      await logActivity({

        userId: req.user.id,

        action: 'ticket_created',

        req,

        metadata: {
          ticketId: ticket._id
        }
      });

      res.status(201).json(ticket);

    } catch (error) {

      console.error(
        '[CREATE TICKET ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// USER GET MY TICKETS
// ======================================================

router.get(
  '/my-tickets',

  auth,

  async (req, res) => {

    try {

      const tickets =
        await SupportTicket.find(

          {
            user: req.user.id
          },

          `
          subject
          message
          status
          priority
          responses
          createdAt
          updatedAt
          `
        )
          .sort({
            createdAt: -1
          })
          .limit(50)
          .lean();

      res.json(tickets);

    } catch (error) {

      console.error(
        '[MY TICKETS ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// ADMIN GET ALL TICKETS
// ======================================================

router.get(
  '/all',

  adminAuth([
    'admin',
    'superadmin',
    'moderator'
  ]),

  async (req, res) => {

    try {

      const tickets =
        await SupportTicket.find(

          {},

          `
          user
          subject
          status
          priority
          assignedTo
          createdAt
          updatedAt
          `
        )
          .populate(
            'user',
            `
            username
            profilePic
            `
          )
          .populate(
            'assignedTo',
            `
            username
            `
          )
          .sort({
            createdAt: -1
          })
          .limit(200)
          .lean();

      res.json(tickets);

    } catch (error) {

      console.error(
        '[ALL TICKETS ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// ADMIN REPLY TO TICKET
// ======================================================

router.post(
  '/reply/:id',

  adminAuth([
    'admin',
    'superadmin',
    'moderator'
  ]),

  validate({
    params: ticketIdParamSchema,
    body: replyTicketSchema
  }),

  async (req, res) => {

    try {

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {

        return res.status(400).json({
          error: 'Invalid ticket ID'
        });
      }

      const {
        message
      } = req.body;

      const ticket =
        await SupportTicket.findById(
          req.params.id
        );

      if (!ticket) {

        return res.status(404).json({
          error: 'Ticket not found'
        });
      }

      // ======================================================
      // ADD RESPONSE
      // ======================================================

      ticket.responses.push({

        admin: req.user.id,

        message:
          message.trim()
      });

      ticket.status =
        'in-progress';

      ticket.lastResponseAt =
        new Date();

      if (!ticket.assignedTo) {

        ticket.assignedTo =
          req.user.id;
      }

      await ticket.save();

      // ======================================================
      // REALTIME USER UPDATE
      // ======================================================

      if (req.io) {

        req.io
          .to(
            `user_${ticket.user}`
          )
          .emit(
            'support-update'
          );
      }

      // ======================================================
      // ACTIVITY LOG
      // ======================================================

      await logActivity({

        userId: req.user.id,

        action:
          'ticket_replied',

        req,

        metadata: {
          ticketId:
            ticket._id
        }
      });

      res.json(ticket);

    } catch (error) {

      console.error(
        '[REPLY TICKET ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



// ======================================================
// ADMIN UPDATE STATUS
// ======================================================

router.patch(
  '/status/:id',

  adminAuth([
    'admin',
    'superadmin',
    'moderator'
  ]),

  validate({
    params: ticketIdParamSchema,
    body: updateStatusSchema
  }),

  async (req, res) => {

    try {

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {

        return res.status(400).json({
          error: 'Invalid ticket ID'
        });
      }

      const {
        status
      } = req.body;

      const updateData = {
        status
      };

      // ======================================================
      // CLOSE TIME
      // ======================================================

      if (
        status === 'resolved'
      ) {

        updateData.closedAt =
          new Date();
      }

      const ticket =
        await SupportTicket.findByIdAndUpdate(

          req.params.id,

          {
            $set: updateData
          },

          {
            new: true
          }
        );

      if (!ticket) {

        return res.status(404).json({
          error: 'Ticket not found'
        });
      }

      // ======================================================
      // REALTIME USER UPDATE
      // ======================================================

      if (req.io) {

        req.io
          .to(
            `user_${ticket.user}`
          )
          .emit(
            'support-update'
          );
      }

      // ======================================================
      // ACTIVITY LOG
      // ======================================================

      await logActivity({

        userId: req.user.id,

        action:
          'ticket_status_change',

        req,

        metadata: {

          ticketId:
            ticket._id,

          status
        }
      });

      res.json(ticket);

    } catch (error) {

      console.error(
        '[STATUS UPDATE ERROR]:',
        error
      );

      res.status(500).json({
        error: 'Server error'
      });
    }
  }
);



module.exports = router;