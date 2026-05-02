const winston = require('winston');
const ActivityLog = require('../models/ActivityLog');
const path = require('path');

// Configure Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ontlo-backend' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error' 
    }),
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log') 
    }),
  ],
});

// If we're not in production then log to the `console` with simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

/**
 * Log an activity to the database (Security Audit)
 */
const logActivity = async ({ userId, action, req, metadata = {} }) => {
  try {
    const logData = {
      userId,
      action,
      metadata,
    };

    if (req) {
      logData.ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      logData.userAgent = req.headers['user-agent'];
    }

    await ActivityLog.create(logData);
    
    // Also log to Winston for observability
    logger.info(`Activity: ${action}`, { userId, ...logData.metadata, ip: logData.ip });
  } catch (error) {
    logger.error('Failed to create activity log', { error: error.message });
  }
};

module.exports = {
  logActivity,
  logger, // Export winston logger for general use
};
