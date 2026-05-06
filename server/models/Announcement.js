const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    // ======================================================
    // TITLE
    // ======================================================

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    // ======================================================
    // CONTENT
    // ======================================================

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },

    // ======================================================
    // TYPE
    // ======================================================

    type: {
      type: String,
      enum: [
        'announcement',
        'alert',
        'info'
      ],
      default: 'announcement',
      index: true
    },

    // ======================================================
    // TARGETING
    // ======================================================

    targetCriteria: {

      role: {
        type: String,
        enum: [
          'user',
          'moderator',
          'admin',
          'superadmin'
        ]
      },

      gender: {
        type: String,
        enum: [
          'Male',
          'Female',
          'Other',
          'Prefer not to say'
        ]
      },

      minAge: {
        type: Number,
        min: 18,
        max: 100
      },

      maxAge: {
        type: Number,
        min: 18,
        max: 100
      },

      location: {
        type: String,
        trim: true,
        maxlength: 100
      }
    },

    // ======================================================
    // SENT BY
    // ======================================================

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // ======================================================
    // STATS
    // ======================================================

    stats: {

      deliveredCount: {
        type: Number,
        default: 0
      },

      clickedCount: {
        type: Number,
        default: 0
      }
    },

    // ======================================================
    // STATUS
    // ======================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // ======================================================
    // OPTIONAL EXPIRY
    // ======================================================

    expiresAt: {
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

AnnouncementSchema.index({
  type: 1,
  createdAt: -1
});

AnnouncementSchema.index({
  isActive: 1,
  createdAt: -1
});

AnnouncementSchema.index({
  sentBy: 1,
  createdAt: -1
});



// ======================================================
// VALIDATION
// ======================================================

AnnouncementSchema.pre('validate', function (next) {

  const {
    minAge,
    maxAge
  } = this.targetCriteria || {};

  if (
    minAge &&
    maxAge &&
    minAge > maxAge
  ) {

    return next(
      new Error(
        'Minimum age cannot exceed maximum age'
      )
    );
  }

  next();
});



module.exports = mongoose.model(
  'Announcement',
  AnnouncementSchema
);