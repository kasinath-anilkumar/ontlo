const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET; // Fallback to JWT_SECRET if not explicitly set

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

module.exports = {
  JWT_SECRET: JWT_SECRET || 'dev_jwt_secret_change_me',
  JWT_REFRESH_SECRET: JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_me'
};
