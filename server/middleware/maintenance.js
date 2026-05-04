const AppConfig = require('../models/AppConfig');
const cacheUtil = require('../utils/cache');

const maintenanceMiddleware = async (req, res, next) => {
  // Skip check for admin routes or login/register
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    return next();
  }

  try {
    // RACE: Don't let the maintenance check hang the whole app
    // If it takes more than 500ms, assume maintenance is OFF and proceed
    const configPromise = cacheUtil.getOrSet('maintenance_config', async () => {
      return await AppConfig.findOne();
    }, 60);

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 500));
    
    const config = await Promise.race([configPromise, timeoutPromise]);

    if (config && config.maintenanceMode === true) {
      return res.status(503).json({ 
        error: 'System Maintenance', 
        message: config.maintenanceMessage || 'Ontlo is currently undergoing a scheduled upgrade. We will be back shortly!' 
      });
    }
    next();
  } catch (err) {
    next(); // Fallback
  }
};

module.exports = maintenanceMiddleware;
