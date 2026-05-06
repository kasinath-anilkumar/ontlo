const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    // ======================================================
    // REPORTER
    // ======================================================

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ======================================================
    // REPORTED USER
    // ======================================================

    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ======================================================
    // REASON
    // ======================================================

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    // ======================================================
    // ROOM
    // ======================================================

    roomId: {
      type: String,
      trim: true,
      default: null
    },

    // ======================================================
    // STATUS
    // ======================================================

    status: {
      type: String,
      enum: [
        'pending',
        'resolved',
        'dismissed'
      ],
      default: 'pending',
      index: true
    },

    // ======================================================
    // SEVERITY
    // ======================================================

    severity: {
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
    // MODERATOR ACTION
    // ======================================================

    moderatorAction: {
      type: String,
      enum: [
        'none',
        'warning',
        'suspended',
        'banned'
      ],
      default: 'none'
    },

    // ======================================================
    // AI MODERATION
    // ======================================================

    aiConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    aiSummary: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    moderatorNote: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    // ======================================================
    // RESOLUTION
    // ======================================================

    resolvedAt: {
      type: Date,
      default: null
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

ReportSchema.index({
  reportedUser: 1,
  status: 1
});

ReportSchema.index({
  reporter: 1,
  createdAt: -1
});

ReportSchema.index({
  severity: 1,
  status: 1
});

ReportSchema.index({
  createdAt: -1
});



// ======================================================
// REPEAT OFFENDER STATS
// ======================================================

ReportSchema.statics.getRepeatOffenderStats =
  async function (userId) {

    const [
      resolvedReports,
      pendingReports
    ] = await Promise.all([

      this.countDocuments({
        reportedUser: userId,
        status: 'resolved'
      }),

      this.countDocuments({
        reportedUser: userId,
        status: 'pending'
      })
    ]);

    return {
      resolvedReports,
      pendingReports
    };
  };



// ======================================================
// VALIDATION
// ======================================================

ReportSchema.pre('validate', function (next) {

  if (
    this.reporter &&
    this.reportedUser &&
    this.reporter.toString() ===
      this.reportedUser.toString()
  ) {

    return next(
      new Error(
        'Users cannot report themselves'
      )
    );
  }

  next();
});



module.exports = mongoose.model(
  'Report',
  ReportSchema
);