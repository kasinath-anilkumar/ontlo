const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema(
  {
    // ======================================================
    // USERS
    // ======================================================

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],

    // ======================================================
    // UNIQUE PAIR KEY
    // Prevent duplicate connections
    // ======================================================

    pairKey: {
      type: String,
      required: true
    },

    // ======================================================
    // STATUS
    // ======================================================

    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
      index: true
    },

    // ======================================================
    // BLOCK INFO
    // ======================================================

    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ======================================================
    // EMBEDDED USER SNAPSHOT
    // Avoid populate()
    // ======================================================

    userDetails: [
      {
        _id: mongoose.Schema.Types.ObjectId,

        username: {
          type: String,
          trim: true
        },

        profilePic: {
          type: String,
          default: ''
        },

        onlineStatus: {
          type: String,
          enum: ['online', 'offline', 'away'],
          default: 'offline'
        }
      }
    ],

    // ======================================================
    // LAST MESSAGE SNAPSHOT
    // ======================================================

    lastMessage: {
      text: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
      },

      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },

      createdAt: {
        type: Date
      }
    },

    // ======================================================
    // MESSAGE COUNT
    // ======================================================

    messageCount: {
      type: Number,
      default: 0
    }

  },
  {
    timestamps: true
  }
);



// ======================================================
// INDEXES
// ======================================================

// Main connection fetch
ConnectionSchema.index({
  users: 1,
  updatedAt: -1
});

// Status filtering
ConnectionSchema.index({
  users: 1,
  status: 1
});

// Pair lookup
ConnectionSchema.index({
  pairKey: 1
}, {
  unique: true
});

// Online filtering
// ConnectionSchema.index({
//   users: 1,
//   "userDetails.onlineStatus": 1
// });



// ======================================================
// PRE VALIDATION
// ======================================================

ConnectionSchema.pre('validate', async function () {

  // Must contain exactly 2 users
  if (this.users.length !== 2) {
    throw new Error('Connection must contain exactly 2 users');
  }

  // Prevent self connection
  if (
    this.users[0].toString() ===
    this.users[1].toString()
  ) {
    throw new Error('Users cannot connect to themselves');
  }

  // Stable ordering
  const sortedUsers = this.users
    .map(id => id.toString())
    .sort();

  this.users = sortedUsers.map(
    id => new mongoose.Types.ObjectId(id)
  );

  // Generate stable pair key
  this.pairKey = sortedUsers.join('_');
});



module.exports = mongoose.model(
  'Connection',
  ConnectionSchema
);