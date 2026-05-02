const { z } = require('zod');

const connectionIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid connection ID format'),
});

module.exports = {
  connectionIdParamSchema,
};
