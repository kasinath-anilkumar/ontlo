const { z } = require('zod');

const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters long').trim(),
  message: z.string().min(10, 'Message must be at least 10 characters long').trim(),
});

const replyTicketSchema = z.object({
  message: z.string().min(1, 'Reply message is required').trim(),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']),
});

const ticketIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ticket ID format'),
});

module.exports = {
  createTicketSchema,
  replyTicketSchema,
  updateStatusSchema,
  ticketIdParamSchema,
};
