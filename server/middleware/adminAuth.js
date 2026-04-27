const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const adminAuth = (roles = ['admin', 'superadmin']) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      const token = authHeader.split(' ')[1];
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

      req.user = user;
      next();
    } catch (err) {
      console.error('Admin Auth Error:', err.message);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};

module.exports = adminAuth;
