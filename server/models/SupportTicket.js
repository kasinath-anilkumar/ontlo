const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema(
  {
    // ======================================================
    // USER
    // ======================================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ======================================================
    // SUBJECT
    // ======================================================

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    // ======================================================
    // MESSAGE
    // ======================================================

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },

    // ======================================================
    // STATUS
    // ======================================================

    status: {
      type: String,
      enum: [
        'pending',
        'in-progress',
        'resolved'
      ],
      default: 'pending',
      index: true
    },

    // ======================================================
    // PRIORITY
    // ======================================================

    priority: {
      type: String,
      enum: [
        'low',
        'medium',
        'high',
        'critical'
      ],
      default: 'low',
      index: true
    },

    // ======================================================
    // RESPONSES
    // ======================================================

    responses: [
      {
        admin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },

        message: {
          type: String,
          trim: true,
          maxlength: 5000
        },

        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ======================================================
    // LAST RESPONSE
    // ======================================================

    lastResponseAt: {
      type: Date,
      default: null
    },

    // ======================================================
    // ASSIGNED MODERATOR
    // ======================================================

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ======================================================
    // CLOSED
    // ======================================================

    closedAt: {
      type: Date,
      default: null
    }

  },
  {
    timestamps: true
  }
);



// ======================================================
// INDEXES
// ======================================================

SupportTicketSchema.index({
  user: 1,
  createdAt: -1
});

SupportTicketSchema.index({
  status: 1,
  createdAt: -1
});

SupportTicketSchema.index({
  priority: 1,
  status: 1
});

SupportTicketSchema.index({
  assignedTo: 1,
  status: 1
});



// ======================================================
// VALIDATION
// ======================================================

SupportTicketSchema.pre('validate', function (next) {

  if (
    this.subject &&
    this.subject.trim().length < 3
  ) {

    return next(
      new Error(
        'Subject must contain at least 3 characters'
      )
    );
  }

  next();
});



module.exports = mongoose.model(
  'SupportTicket',
  SupportTicketSchema
);