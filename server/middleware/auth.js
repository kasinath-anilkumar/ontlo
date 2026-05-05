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
  const startTime = Date.now();
  
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
    const jwtStart = Date.now();
    const decoded = jwt.verify(token, JWT_SECRET);
    const jwtTime = Date.now() - jwtStart;
    if (jwtTime > 50) console.log(`[AUTH] JWT verify took ${jwtTime}ms`);
    
    req.userId = decoded.id;
    req.user = decoded; 

    if (roles && roles.length > 0) {
      const userStart = Date.now();
      const user = await User.findById(decoded.id);
      const userTime = Date.now() - userStart;
      console.log(`[AUTH] User lookup took ${userTime}ms`);
      
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Forbidden: Account is ' + user.status });
      }
      req.user = user; 
    }

    const totalTime = Date.now() - startTime;
    if (totalTime > 100) {
      console.log(`[AUTH] Total auth time: ${totalTime}ms for ${req.path}`);
    }
    
    next();
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[AUTH ERROR] ${req.path} failed after ${totalTime}ms:`, err.message);
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
