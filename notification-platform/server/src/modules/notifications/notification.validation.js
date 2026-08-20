const { z } = require('zod');

const sendNotificationSchema = z.object({
  body: z.object({
    template: z
      .string({ required_error: 'Template identifier is required' })
      .trim()
      .min(1, 'Template identifier cannot be empty'),
    recipient: z
      .string({ required_error: 'Recipient is required' })
      .trim()
      .min(1, 'Recipient cannot be empty'),
    data: z.record(z.any()).optional().default({}),
  }),
});

const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']).optional(),
    recipient: z.string().optional(),
  }),
});

const getNotificationSchema = z.object({
  params: z.object({
    notificationId: z.string().uuid('Invalid Notification ID format'),
  }),
});

module.exports = {
  sendNotificationSchema,
  listNotificationsSchema,
  getNotificationSchema,
};
