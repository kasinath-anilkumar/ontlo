const { z } = require('zod');

const connectionIdParamSchema = z.object({
  connectionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid connection ID format'),
});

module.exports = {
  connectionIdParamSchema,
};
