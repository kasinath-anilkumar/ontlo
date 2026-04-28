const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

module.exports = {
  JWT_SECRET: JWT_SECRET || 'dev_jwt_secret_change_me'
};
