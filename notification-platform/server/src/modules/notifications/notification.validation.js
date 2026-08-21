const { z } = require('zod');

const sendNotificationSchema = z.object({
  body: z.object({
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'], {
      invalid_type_error: 'Invalid notification channel. Supported: EMAIL, SMS, WHATSAPP, PUSH',
    }).optional(),
    template: z
      .string({ required_error: 'Template identifier is required' })
      .trim()
      .min(1, 'Template identifier cannot be empty'),
    category: z.enum(['TRANSACTIONAL', 'SECURITY', 'MARKETING', 'SYSTEM']).optional().default('TRANSACTIONAL'),
    recipient: z.union([
      z.string().trim().min(1, 'Recipient string cannot be empty'),
      z.object({
        externalUserId: z.string().trim().min(1, 'externalUserId is required'),
        email: z.string().email('Invalid email format').optional(),
        phone: z.string().optional(),
      }),
    ], { required_error: 'Recipient string or object is required' }),
    data: z.record(z.any()).optional().default({}),
    scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO-8601 datetime string' }).optional(),
  }),
});

const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'RETRYING', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'SCHEDULED']).optional(),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']).optional(),
    recipient: z.string().optional(),
  }),
});

const getNotificationSchema = z.object({
  params: z.object({
    notificationId: z.string().uuid('Invalid Notification ID format'),
  }),
});

const cancelNotificationSchema = z.object({
  params: z.object({
    notificationId: z.string().uuid('Invalid Notification ID format'),
  }),
});

module.exports = {
  sendNotificationSchema,
  listNotificationsSchema,
  getNotificationSchema,
  cancelNotificationSchema,
};
