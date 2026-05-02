const { z } = require('zod');

const submitReportSchema = z.object({
  reportedUserId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  reason: z.string().min(5, 'Reason must be at least 5 characters long').trim(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('low'),
  roomId: z.string().optional(),
});

const updateReportSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters long').trim(),
});

const reportIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid report ID format'),
});

module.exports = {
  submitReportSchema,
  updateReportSchema,
  reportIdParamSchema,
};
