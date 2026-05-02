const { logger } = require('./logger');

const stats = {
  activeConnections: 0,
  totalRequests: 0,
  failedLogins: 0,
  avgResponseTime: 0,
  lastReset: Date.now()
};

const monitor = {
  /**
   * Track Socket connection
   */
  trackSocketConnection: () => {
    stats.activeConnections++;
  },

  /**
   * Track Socket disconnection
   */
  trackSocketDisconnection: () => {
    stats.activeConnections = Math.max(0, stats.activeConnections - 1);
  },

  /**
   * Track Failed Login
   */
  trackFailedLogin: () => {
    stats.failedLogins++;
  },

  /**
   * Middleware to track API performance
   */
  requestMonitor: (req, res, next) => {
    const start = Date.now();
    stats.totalRequests++;

    res.on('finish', () => {
      const duration = Date.now() - start;
      // Exponential moving average for response time
      stats.avgResponseTime = (stats.avgResponseTime * 0.9) + (duration * 0.1);
      
      if (duration > 1000) {
        logger.warn('Slow Request Detected', { 
          path: req.path, 
          method: req.method, 
          duration: `${duration}ms` 
        });
      }
    });

    next();
  },

  /**
   * Get current metrics
   */
  getMetrics: () => {
    return {
      ...stats,
      uptime: Math.floor((Date.now() - stats.lastReset) / 1000)
    };
  }
};

module.exports = monitor;
