const { z } = require('zod');

const createStaffSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'moderator']).optional().default('moderator'),
});

const userActionSchema = z.object({
  action: z.string().optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  isVerified: z.boolean().optional(),
});

const resolveReportSchema = z.object({
  action: z.string().min(1, 'Action description is required').trim(),
});

const broadcastSchema = z.object({
  text: z.string().min(1, 'Broadcast text is required').trim(),
  type: z.string().optional().default('announcement'),
});

const keywordsSchema = z.object({
  keywords: z.array(z.string().trim()).min(1, 'At least one keyword is required'),
});

const matchmakingConfigSchema = z.object({
  settings: z.object({
    radius: z.number().min(0).max(1000).optional(),
    ageGap: z.number().min(0).max(50).optional(),
    boostPremium: z.boolean().optional(),
  }),
});

const updateProfileSchema = z.object({
  fullName: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  role: z.enum(['user', 'moderator', 'admin', 'superadmin']).optional(),
});

const configUpdateSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
  dailyMessageLimit: z.number().optional(),
  bioMaxLength: z.number().optional(),
  bannedKeywords: z.array(z.string().trim()).optional(),
  // Add other config fields as needed
}).passthrough();

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  search: z.string().optional().default(''),
  role: z.string().optional(),
  status: z.string().optional(),
});

module.exports = {
  createStaffSchema,
  userActionSchema,
  resolveReportSchema,
  broadcastSchema,
  keywordsSchema,
  matchmakingConfigSchema,
  updateProfileSchema,
  configUpdateSchema,
  idParamSchema,
  querySchema,
};
