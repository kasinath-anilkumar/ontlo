const AppConfig = require('../models/AppConfig');

const maintenanceMiddleware = async (req, res, next) => {
  // Skip check for admin routes or login/register if needed
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    return next();
  }

  try {
    const config = await AppConfig.findOne();
    if (config && config.maintenanceMode === true) {
      return res.status(503).json({ 
        error: 'System Maintenance', 
        message: config.maintenanceMessage || 'Ontlo is currently undergoing a scheduled upgrade. We will be back shortly!' 
      });
    }
    next();
  } catch (err) {
    next(); // Fallback to let traffic through if config fails
  }
};

module.exports = maintenanceMiddleware;
