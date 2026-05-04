const User = require('../models/User');
const Report = require('../models/Report');
const { logActivity } = require('./logger');

/**
 * Check if a user's behavior is suspicious or abusive
 * @param {string} userId - User ID to check
 * @param {Object} io - Socket.io instance for real-time notifications
 */
const checkUserBehavior = async (userId, io) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    let suspicionScore = 0;

    // 1. Check report count (removed skip count check per user request)

    // 2. Check report count
    const reportStats = await Report.getRepeatOffenderStats(userId);
    suspicionScore += (reportStats.resolvedReports * 10) + (reportStats.pendingReports * 5);

    // 3. Flag user if score is high
    const SUSPICION_THRESHOLD = 50;
    
    if (suspicionScore >= SUSPICION_THRESHOLD && !user.isShadowBanned) {
      // We don't necessarily ban them immediately, but we flag them
      // In this case, maybe shadow-ban or just alert admins
      
      await logActivity({
        userId,
        action: 'suspicious_activity',
        metadata: { 
          suspicionScore, 
          detail: 'Auto-detected high suspicion score based on skips and reports' 
        }
      });

      // Optionally, notify admins
      if (io) {
        io.emit('support-update-admin', { 
          type: 'alert', 
          message: `Suspicious behavior detected for user: ${user.username}` 
        });
      }
    }

    return suspicionScore;
  } catch (error) {
    console.error('Abuse detection error:', error);
  }
};

module.exports = {
  checkUserBehavior,
};
