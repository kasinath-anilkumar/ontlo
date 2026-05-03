const cron = require('node-cron');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const User = require('../models/User');
const Message = require('../models/Message');
const ActivityLog = require('../models/ActivityLog');

/**
 * Automated Data Retention & Cleanup Jobs
 */
const startCleanupJobs = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting scheduled cleanup jobs...');
    
    try {
      logger.info('Scheduled cleanup is currently DISABLED per user request.');
      
      /* 
      // Preservation Mode: Not deleting anything to avoid data loss of "essential" logs.
      // Be careful of MongoDB 512MB storage limits.
      */

      logger.info('Cleanup jobs skipped.');
    } catch (error) {
      logger.error('Cleanup job failed:', { error: error.message });
    }
  });

  logger.info('✅ Automated cleanup jobs scheduled (Midnight daily)');
};

module.exports = startCleanupJobs;
