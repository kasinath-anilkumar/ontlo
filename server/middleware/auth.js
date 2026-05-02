const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const User = require('../models/User');

const auth = (rolesOrReq, res, next) => {
  // If used directly as middleware: auth(req, res, next)
  if (rolesOrReq && rolesOrReq.headers) {
    return handleAuth(rolesOrReq, res, next, []);
  }

  // If used as factory: auth(['admin'])
  const roles = Array.isArray(rolesOrReq) ? rolesOrReq : [];
  return (req, response, nextFunction) => {
    return handleAuth(req, response, nextFunction, roles);
  };
};

const handleAuth = async (req, res, next, roles) => {
  // First try to get token from HTTP-only cookie, then fallback to Authorization header
  let token = req.cookies?.token;
  if (!token) {
    const tokenHeader = req.headers.authorization;
    if (tokenHeader && tokenHeader.startsWith('Bearer ')) {
      token = tokenHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.user = decoded; 

    if (roles && roles.length > 0) {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Forbidden: Account is ' + user.status });
      }
      req.user = user; 
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

auth.optional = (req, res, next) => {
  let token = req.cookies?.token;
  if (!token) {
    const tokenHeader = req.headers.authorization;
    if (tokenHeader && tokenHeader.startsWith('Bearer ')) {
      token = tokenHeader.split(' ')[1];
    }
  }

  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.user = decoded;
  } catch (err) {}
  next();
};

module.exports = auth;
