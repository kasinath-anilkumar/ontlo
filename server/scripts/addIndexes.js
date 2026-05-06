// scripts/addIndexes.js

const mongoose = require('mongoose');

require('dotenv').config();



// ======================================================
// ENV
// ======================================================

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/ontlo';



// ======================================================
// INDEX DEFINITIONS
// ======================================================

const indexes = [

  // ======================================================
  // USERS
  // ======================================================

  {
    collection: 'users',

    index: {
      onlineStatus: 1,
      role: 1
    },

    options: {
      name:
        'onlineStatus_1_role_1',

      background: true
    }
  },

  {
    collection: 'users',

    index: {
      interests: 1
    },

    options: {
      name:
        'interests_1',

      background: true
    }
  },

  {
    collection: 'users',

    index: {
      email: 1
    },

    options: {
      unique: true,

      sparse: true,

      name:
        'email_1',

      background: true
    }
  },

  {
    collection: 'users',

    index: {
      username: 1
    },

    options: {
      unique: true,

      name:
        'username_1',

      background: true
    }
  },

  {
    collection: 'users',

    index: {
      isPremium: 1
    },

    options: {
      name:
        'isPremium_1',

      background: true
    }
  },



  // ======================================================
  // CONNECTIONS
  // ======================================================

  {
    collection: 'connections',

    index: {
      users: 1,
      updatedAt: -1
    },

    options: {
      name:
        'users_1_updatedAt_-1',

      background: true
    }
  },

  {
    collection: 'connections',

    index: {
      users: 1,
      status: 1
    },

    options: {
      name:
        'users_1_status_1',

      background: true
    }
  },



  // ======================================================
  // MESSAGES
  // ======================================================

  {
    collection: 'messages',

    index: {
      connectionId: 1,
      createdAt: 1
    },

    options: {
      name:
        'connectionId_1_createdAt_1',

      background: true
    }
  },

  {
    collection: 'messages',

    index: {
      connectionId: 1,
      isRead: 1
    },

    options: {
      name:
        'connectionId_1_isRead_1',

      background: true
    }
  },



  // ======================================================
  // NOTIFICATIONS
  // ======================================================

  {
    collection: 'notifications',

    index: {
      user: 1,
      createdAt: -1
    },

    options: {
      name:
        'user_1_createdAt_-1',

      background: true
    }
  },

  {
    collection: 'notifications',

    index: {
      user: 1,
      isRead: 1
    },

    options: {
      name:
        'user_1_isRead_1',

      background: true
    }
  },



  // ======================================================
  // REPORTS
  // ======================================================

  {
    collection: 'reports',

    index: {
      reportedUser: 1,
      status: 1
    },

    options: {
      name:
        'reportedUser_1_status_1',

      background: true
    }
  },

  {
    collection: 'reports',

    index: {
      createdAt: -1
    },

    options: {
      name:
        'createdAt_-1',

      background: true
    }
  },



  // ======================================================
  // LIKES
  // ======================================================

  {
    collection: 'likes',

    index: {
      fromUser: 1,
      toUser: 1
    },

    options: {
      unique: true,

      name:
        'fromUser_1_toUser_1',

      background: true
    }
  }
];



// ======================================================
// ADD INDEXES
// ======================================================

async function addIndexes() {

  try {

    console.log(
      '📦 Connecting to MongoDB...'
    );

    await mongoose.connect(

      MONGO_URI,

      {

        connectTimeoutMS:
          10000,

        serverSelectionTimeoutMS:
          10000,

        maxPoolSize: 2,

        minPoolSize: 0
      }
    );

    console.log(
      '✅ MongoDB connected'
    );

    const db =
      mongoose.connection.db;

    // ======================================================
    // LOOP
    // ======================================================

    for (const item of indexes) {

      try {

        console.log(

          `⚡ Creating index on ${item.collection}`
        );

        const collection =
          db.collection(
            item.collection
          );

        await collection.createIndex(

          item.index,

          item.options
        );

        console.log(

          `✅ ${item.options.name}`
        );

      } catch (error) {

        // Ignore existing index
        if (
          error.codeName ===
            'IndexOptionsConflict' ||

          error.code === 85
        ) {

          console.warn(

            `⚠️ Index exists: ${item.options.name}`
          );

        } else {

          console.error(

            `❌ Failed index ${item.options.name}`,

            error.message
          );
        }
      }
    }

    console.log(
      '🎉 Index creation completed'
    );

  } catch (error) {

    console.error(

      '❌ Mongo connection failed',

      error.message
    );

  } finally {

    try {

      await mongoose.connection.close();

      console.log(
        '📦 Mongo connection closed'
      );

    } catch (error) {

      console.error(
        '[CLOSE ERROR]',
        error
      );
    }

    process.exit(0);
  }
}



// ======================================================
// START
// ======================================================

addIndexes();