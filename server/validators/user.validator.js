const { z } = require('zod');

const blockUserSchema = z.object({
  blockedUserId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

const unblockUserSchema = z.object({
  unblockUserId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

const settingsSchema = z.object({
  settings: z.object({
    emailNotifications: z.boolean().optional(),
    discoveryMode: z.boolean().optional(),
    stealthMode: z.boolean().optional(),
    language: z.string().optional(),
  }).partial(),
});

const userIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

module.exports = {
  blockUserSchema,
  unblockUserSchema,
  settingsSchema,
  userIdParamSchema,
};
