const { z } = require('zod');

/**
 * Middleware to validate request data using Zod
 * @param {Object} schemas - Object containing Zod schemas for body, query, and params
 * @returns {Function} Express middleware function
 */
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || error.errors || [];
      const errorMessages = issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      console.error('Validation Error:', errorMessages);
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        error: errorMessages[0].message, // For frontend display
        errors: errorMessages,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error during validation',
    });
  }
};

module.exports = validate;
