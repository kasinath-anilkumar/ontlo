const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => res.send('Ontlo API is running...'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/report', require('./routes/report'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));

// Initialize Socket.io Logic
require('./socket')(io);

// Config
let PORT = parseInt(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ontlo';

// Robust Startup Function
const startServer = async (port) => {
  try {
    // Attempt MongoDB Connection first
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    server.listen(port)
      .on('listening', () => {
        console.log(`🚀 Server is live on: http://localhost:${port}`);
        console.log(`📡 WebSocket Signaling active on port ${port}`);
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
    console.log('🔄 Attempting to start server in offline mode...');
    // Fallback start without DB
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
startServer(PORT);
