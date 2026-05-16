// server.js

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dns = require('dns');

// Fix for MongoDB SRV resolution issues in some environments
dns.setServers(['8.8.8.8', '8.8.4.4']);

const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { Server } = require('socket.io');
const User = require('./models/User');

const { logger } = require('./utils/logger');
const monitor = require('./utils/monitor');

dotenv.config();



// ======================================================
// APP
// ======================================================

const app = express();

app.set('trust proxy', 1);

const server =
  http.createServer(app);

const io =
  new Server(server, {

    cors: {

      origin: (
        process.env.CORS_ORIGIN ||
        '*'
      )
        .split(',')
        .map(o => o.trim()),

      credentials: true,

      methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE'
      ]
    },

    pingTimeout: 60000,

    pingInterval: 25000,

    transports: [
      'websocket',
      'polling'
    ]
  });



// ======================================================
// ENV
// ======================================================

const isProduction =
  process.env.NODE_ENV ===
  'production';

const PORT =
  Number(process.env.PORT) ||
  5000;

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/ontlo';



// ======================================================
// REQUIRED ENVS
// ======================================================

const requiredEnvVars = [

  'MONGO_URI',

  'JWT_SECRET',

  'JWT_REFRESH_SECRET',

  'CLOUDINARY_CLOUD_NAME',

  'CLOUDINARY_API_KEY',

  'CLOUDINARY_API_SECRET'
];

const missingEnvVars =
  requiredEnvVars.filter(
    key => !process.env[key]
  );

if (
  missingEnvVars.length > 0
) {

  console.warn(
    `⚠️ Missing env vars: ${missingEnvVars.join(', ')}`
  );
}



// ======================================================
// REQUEST TIMEOUTS
// ======================================================

server.requestTimeout =
  30000;

server.headersTimeout =
  35000;



// ======================================================
// CORS
// ======================================================

const allowedOrigins =
  (
    process.env.CORS_ORIGIN ||
    process.env.CLIENT_URL ||
    ''
  )

    .split(',')

    .map(origin =>
      origin.trim()
    )

    .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (
      allowedOrigins.some(allowed => origin.includes(allowed)) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('vercel.app')
    ) {
      callback(null, true);
    } else {
      // In development, we can be more permissive if needed, but for now let's stick to allowed origins
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 204
};



// ======================================================
// PROFILER
// ======================================================

app.use((
  req,
  res,
  next
) => {

  const start =
    Date.now();

  const stages = [

    {
      name: 'Init',
      time: start
    }
  ];

  res.on(
    'finish',

    () => {

      const duration =
        Date.now() - start;

      if (
        duration > 1000
      ) {

        console.log(
          `[PROFILER] ${req.method} ${req.path} took ${duration}ms`
        );

        console.log(

          stages
            .map(
              s =>
                `${s.name}: +${s.time - start}ms`
            )
            .join(' -> ')
        );
      }
    }
  );

  req._mark =
    (name) => {

      stages.push({

        name,

        time:
          Date.now()
      });
    };

  next();
});



// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  cors(corsOptions)
);

app.use(
  helmet({

    contentSecurityPolicy:
      false,

    crossOriginResourcePolicy:
      false,

    crossOriginEmbedderPolicy:
      false
  })
);

app.use(
  compression()
);

app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({

    extended: true,

    limit: '10mb'
  })
);

app.use(
  cookieParser()
);



// ======================================================
// API REQUEST LOGGING
// ======================================================

app.use((
  req,
  res,
  next
) => {

  if (
    req.path.startsWith(
      '/api/'
    )
  ) {

    console.log(

      `[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`
    );
  }

  next();
});



// ======================================================
// MONITOR
// ======================================================

app.use(
  monitor.requestMonitor
);



// ======================================================
// SOCKET ACCESS
// ======================================================

app.use((
  req,
  res,
  next
) => {

  req.io = io;

  next();
});



// ======================================================
// ROUTES
// ======================================================

app.get(
  '/',
  (req, res) => {
    if (req._mark) req._mark('Route Start');
    res.send(
      'Ontlo API is running...'
    );
  }
);

app.get(
  '/health',
  (req, res) => {

    const dbReady =
      mongoose.connection.readyState === 1;

    res.status(
      dbReady ? 200 : 503
    ).json({

      status:
        dbReady
          ? 'ok'
          : 'degraded',

      database:
        dbReady
          ? 'connected'
          : 'disconnected'
    });
  }
);



// ======================================================
// API ROUTES
// ======================================================

app.use(
  '/api/auth',
  require('./routes/auth')
);

app.use(
  '/api/connections',
  require('./routes/connections')
);

app.use(
  '/api/interactions',
  require('./routes/interactions')
);

app.use(
  '/api/report',
  require('./routes/report')
);

app.use(
  '/api/messages',
  require('./routes/messages')
);

app.use(
  '/api/users',
  require('./routes/users')
);

app.use(
  '/api/upload',
  require('./routes/upload')
);

app.use(
  '/api/stats',
  require('./routes/stats')
);

app.use(
  '/api/notifications',
  require('./routes/notifications')
);

app.use(
  '/api/support',
  require('./routes/support')
);

app.use(
  '/api/billing',
  require('./routes/billing')
);

app.use(
  '/api/admin',
  require('./routes/admin')
);



// ======================================================
// 404 HANDLER (JSON)
// ======================================================
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`
  });
});



// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((
  err,
  req,
  res,
  next
) => {

  logger.error(
    '[UNHANDLED ERROR]',

    {

      error:
        err.message,

      stack:
        err.stack,

      path:
        req.path,

      method:
        req.method
    }
  );

  res.status(
    err.status || 500
  ).json({

    error:
      isProduction

        ? 'Internal Server Error'

        : err.message
  });
});



// ======================================================
// SOCKET INIT
// ======================================================

require('./socket')(io);



// ======================================================
// START SERVER
// ======================================================

const startServer =
  async () => {

    try {

      // ======================================================
      // MONGO CONNECT
      // ======================================================
      console.log('[DB] Connecting...');
      await mongoose.connect(MONGO_URI, {
        connectTimeoutMS: 20000,
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        waitQueueTimeoutMS: 15000,
        retryWrites: true,
        autoIndex: false, // Prevent automatic index sync from blocking startup
        retryReads: true,
        maxPoolSize: 50,
        minPoolSize: 5
      });

      logger.info('✅ MongoDB Connected');

      // ======================================================
      // START HTTP IMMEDIATELY
      // ======================================================
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on ${PORT}`);
        
        // ======================================================
        // BACKGROUND INITIALIZATION (Delayed to avoid startup congestion)
        // ======================================================
        setTimeout(async () => {
          console.log('[BG] Starting background initialization tasks...');
          try {
            // 1. Reset online status (non-blocking)
            const resetStart = Date.now();
            await User.updateMany(
              { onlineStatus: 'online' },
              { $set: { onlineStatus: 'offline' } }
            ).maxTimeMS(30000); // 30s timeout for heavy updates
            console.log(`[DB] Reset online statuses in ${Date.now() - resetStart}ms`);

            // 2. Index Sync (Optional/Dev only)
            if (!isProduction || process.env.SYNC_INDEXES === 'true') {
              console.log('[BG] Syncing database indexes...');
              const modelsToSync = ['User', 'Connection', 'Message', 'Notification'];
              for (const modelName of modelsToSync) {
                try {
                  const model = mongoose.model(modelName);
                  if (modelName === 'Connection') {
                    const indexes = await model.collection.indexes().catch(() => []);
                    if (indexes.find(idx => idx.name === 'users_1')?.unique) {
                      await model.collection.dropIndex('users_1').catch(() => {});
                    }
                  }
                  await model.createIndexes();
                } catch (e) {
                  console.warn(`[INDEX ERROR] ${modelName}: ${e.message}`);
                }
              }
              console.log('[BG] Index sync complete.');
            }
          } catch (err) {
            console.error('[BG INIT ERROR]:', err);
          }
        }, 30000); // Wait 30s before starting heavy tasks
      });

    } catch (error) {

      console.error(

        '❌ MongoDB connection failed:',

        error.message
      );

      console.log(
        '⚠️ Server running without DB'
      );
    }
  };



// ======================================================
// MONGO EVENTS
// ======================================================

mongoose.connection.on(
  'connected',

  () => {

    console.log(
      '📦 Mongo connected'
    );
  }
);

mongoose.connection.on(
  'disconnected',

  () => {

    console.warn(
      '⚠️ Mongo disconnected'
    );
  }
);

mongoose.connection.on(
  'reconnected',

  () => {

    console.log(
      '🔄 Mongo reconnected'
    );
  }
);



// ======================================================
// MEMORY MONITOR
// ======================================================

setInterval(() => {

  try {

    const memory =
      process.memoryUsage();

    const heap =
      (
        memory.heapUsed /
        1024 /
        1024
      ).toFixed(2);

    const rss =
      (
        memory.rss /
        1024 /
        1024
      ).toFixed(2);

    if (
      Number(heap) > 350
    ) {

      console.warn(
        `[MEMORY WARNING] Heap: ${heap}MB`
      );
    }

    if (
      Number(rss) > 450
    ) {

      console.warn(
        `[MEMORY WARNING] RSS: ${rss}MB`
      );
    }

  } catch (error) {

    console.error(
      '[MEMORY MONITOR ERROR]',
      error
    );
  }

}, 60000);



// ======================================================
// EVENT LOOP MONITOR
// ======================================================

let lastLoop = Date.now();

setInterval(() => {
  const now = Date.now();
  const lag = now - lastLoop - 1000;
  if (lag > 200) {
    console.warn(`[LAG WARNING] Event loop lag: ${lag}ms`);
  }
  lastLoop = now;
}, 1000);



// ======================================================
// SHUTDOWN
// ======================================================

const gracefulShutdown =
  async (signal) => {

    console.log(
      `🛑 ${signal} received`
    );

    io.close(() => {

      console.log(
        '🔌 Socket closed'
      );
    });

    server.close(
      async () => {

        console.log(
          '🌐 HTTP closed'
        );

        try {

          await mongoose.connection.close();

          console.log(
            '📦 Mongo closed'
          );

        } catch (error) {

          console.error(
            '[MONGO CLOSE ERROR]',
            error
          );
        }

        process.exit(0);
      }
    );

    setTimeout(() => {

      console.error(
        '⚠️ Force shutdown'
      );

      process.exit(1);

    }, 10000);
  };



// ======================================================
// PROCESS EVENTS
// ======================================================

process.on(
  'SIGTERM',

  () =>
    gracefulShutdown(
      'SIGTERM'
    )
);

process.on(
  'SIGINT',

  () =>
    gracefulShutdown(
      'SIGINT'
    )
);

process.on(
  'unhandledRejection',

  (reason, promise) => {

    console.error(
      '[UNHANDLED REJECTION]',
      reason
    );
  }
);

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]:', error);
  process.exit(1);
});








// ======================================================
// CLEANUP JOBS
// ======================================================

if (
  process.env.NODE_ENV !==
  'test'
) {

  const startCleanupJobs =
    require('./scripts/cleanup');

  startCleanupJobs();
}



// ======================================================
// KEEP ALIVE
// ======================================================

if (isProduction) {

  const startKeepAlive =
    require('./scripts/keepAlive');

  startKeepAlive();
}



// ======================================================
// START
// ======================================================

startServer();



// ======================================================
// EXPORTS
// ======================================================

module.exports = {

  app,

  server,

  io
};