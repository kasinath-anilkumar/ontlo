const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { logger } = require('./utils/logger');
const monitor = require('./utils/monitor');

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGIN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (isProduction && missingEnvVars.length > 0) {
  console.error(`Missing required production environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.length === 0 || 
                     allowedOrigins.includes(origin) ||
                     origin.endsWith('.vercel.app') || 
                     origin.endsWith('.onrender.com') ||
                     origin.includes('localhost') ||
                     origin.includes('127.0.0.1');

    if (isAllowed) {
      callback(null, true);
    } else {
      // Instead of an error, just return false so cors middleware handles it
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Socket.io
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
});

// Security: Rate Limiting
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased from 200 to 2000 to prevent blocking legitimate polling
  message: { error: 'Too many requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const cspDirectives = {
  defaultSrc: "'self'",
  baseUri: "'self'",
  objectSrc: "'none'",
  frameAncestors: "'none'",
  scriptSrc: "'self'",
  scriptSrcAttr: "'none'",
  styleSrc: "'self' 'unsafe-inline' https://fonts.googleapis.com",
  imgSrc: "'self' data: blob: https: https://res.cloudinary.com",
  fontSrc: "'self' data: https://fonts.gstatic.com",
  connectSrc: "'self' https: wss: http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*",
  mediaSrc: "'self' https://assets.mixkit.co blob:",
  formAction: "'self'",
  upgradeInsecureRequests: []
};

// Middleware
// Profiler Middleware: Measure exactly where the 10s delay is happening
app.use((req, res, next) => {
  const start = Date.now();
  const stages = [{ name: 'Init', time: start }];
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`[PROFILER] 🕒 SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
      console.log(`[PROFILER] Stages: ${stages.map(s => `${s.name}: +${s.time - start}ms`).join(' -> ')}`);
    }
  });

  req._mark = (name) => stages.push({ name, time: Date.now() });
  next();
});

app.use(cors(corsOptions));

// Only use security headers in production, disable compression as it's too heavy for free tier
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: cspDirectives
    }
  }));
} else {
  app.use(helmet({ contentSecurityPolicy: false }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Lightweight request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  }
  next();
});

// SHIM: Express 5 makes req.query a getter. 
// express-mongo-sanitize needs to mutate it, so we redefine it.
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
});

app.use(mongoSanitize());
app.use(xss());
app.use(monitor.requestMonitor);
// app.use(maintenanceMiddleware);

app.use((req, res, next) => {
  req._mark('MaintenanceCheck');
  next();
});
app.use((req, res, next) => {
  if (isProduction && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }
  next();
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Apply rate limits
app.use('/api/', apiLimiter); // General rate limit for all API routes
app.use('/api/auth/login', authLimiter); // Stricter rate limit for login
app.use('/api/auth/register', authLimiter); // Stricter rate limit for registration

// Routes
app.get('/', (req, res) => res.send('Ontlo API is running...'));
app.get('/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    database: dbReady ? 'connected' : 'disconnected'
  });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/report', require('./routes/report'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/support', require('./routes/support'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/admin', require('./routes/admin'));

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Exception:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// Initialize Socket.io Logic
require('./socket')(io);

// Config
let PORT = parseInt(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ontlo';

// Robust Startup Function
const startServer = async (port) => {
  try {
    console.log('[DB] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      connectTimeoutMS: 10000, // 10 second timeout
      serverSelectionTimeoutMS: 10000
    });
    logger.info('✅ MongoDB Connected');

    // Simple Request Logger for Debugging
    app.use((req, res, next) => {
      console.log(`[REQ] ${req.method} ${req.path}`);
      next();
    });

    server.listen(port, '0.0.0.0')
      .on('listening', () => {
        console.log(`🚀 Server is live on port ${port}`);
        console.log(`📡 WebSocket Signaling active`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️  Port ${port} is occupied. Retrying on ${port + 1}...`);
          startServer(port + 1);
        } else {
          console.error('❌ Server failed to start:', err);
          process.exit(1);
        }
      });

  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    if (isProduction) {
      process.exit(1);
    }
    console.log('🔄 Attempting to start server in offline mode...');
    server.listen(port);
  }
};

// Graceful Shutdown Logic
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // 1. Close Socket.io connections
  io.close(() => {
    console.log('🔌 WebSocket connections closed.');
  });

  // 2. Stop accepting new HTTP requests
  server.close(async () => {
    console.log('🌐 HTTP server closed.');

    // 3. Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log('📦 MongoDB connection closed.');
    } catch (err) {
      console.error('Error during DB closure:', err);
    }

    console.log('👋 Clean exit. Goodbye!');
    process.exit(0);
  });

  // Force exit if shutdown takes too long (10s)
  setTimeout(() => {
    console.error('⚠️  Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the engine
const startCleanupJobs = require('./scripts/cleanup');
startCleanupJobs();

startServer(PORT);

// Keep-alive for Render (prevents sleep mode)
if (isProduction) {
  const startKeepAlive = require('./scripts/keepAlive');
  startKeepAlive();
}

module.exports = { app, server };
