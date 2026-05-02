const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppConfig = require('../models/AppConfig');
const { JWT_SECRET } = require('../config/jwt');

const adminAuth = (roles = ['admin', 'superadmin']) => {
  return async (req, res, next) => {
    try {
      let token = req.cookies?.token;
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Forbidden: Account is ' + user.status });
      }

      // Ensure roles is always an array and check both the role and specific admin permissions
      const allowedRoles = Array.isArray(roles) ? roles : ['admin', 'superadmin'];
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      // IP Restriction Check
      const config = await AppConfig.findOne();
      if (config && config.allowedAdminIPs && config.allowedAdminIPs.length > 0) {
        const clientIp = req.ip || req.connection.remoteAddress;
        const isAllowed = config.allowedAdminIPs.includes(clientIp) || 
                         clientIp === '127.0.0.1' || 
                         clientIp === '::1';
        
        if (!isAllowed) {
          console.warn(`Blocked admin access attempt from unauthorized IP: ${clientIp}`);
          return res.status(403).json({ error: 'Forbidden: Access restricted to authorized IP ranges' });
        }
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('Admin Auth Error:', err.message);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};

module.exports = adminAuth;
