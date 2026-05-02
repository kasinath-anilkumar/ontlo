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
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 1. Cleanup Old Activity Logs (Security Policy: 90 days retention)
      const logsDeleted = await ActivityLog.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
      logger.info(`Cleaned up ${logsDeleted.deletedCount} old activity logs.`);

      // 2. Cleanup Unverified Accounts (Safety: Delete after 24h)
      const usersDeleted = await User.deleteMany({ 
        isVerified: false, 
        createdAt: { $lt: twentyFourHoursAgo },
        role: 'user' // Don't delete unverified admins
      });
      logger.info(`Cleaned up ${usersDeleted.deletedCount} unverified accounts.`);

      // 3. Cleanup Old Messages (Optional: depends on business logic, here we keep for 30 days if not part of a permanent connection)
      // For Ontlo, messages are mostly transient in random chats
      // But we'll leave this for now to avoid data loss unless specified

      logger.info('Cleanup jobs completed successfully.');
    } catch (error) {
      logger.error('Cleanup job failed:', { error: error.message });
    }
  });

  logger.info('✅ Automated cleanup jobs scheduled (Midnight daily)');
};

module.exports = startCleanupJobs;
