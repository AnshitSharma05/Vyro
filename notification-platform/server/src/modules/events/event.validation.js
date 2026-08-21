const { z } = require('zod');

const EVENT_NAME_REGEX = /^[A-Z0-9_:-]+$/i;

const ingestEventSchema = z.object({
  body: z.object({
    event: z
      .string({ required_error: 'event name is required' })
      .min(1)
      .max(100)
      .regex(EVENT_NAME_REGEX, 'event name must contain only alphanumeric characters, underscores, colons, or hyphens'),
    externalEventId: z
      .string({ required_error: 'externalEventId is required' })
      .min(1)
      .max(128)
      .trim(),
    recipient: z.union([
      z.string().trim().min(1, 'Recipient string cannot be empty'),
      z.object({
        externalUserId: z.string().trim().min(1, 'externalUserId is required'),
        email: z.string().email('Invalid email format').optional(),
        phone: z.string().optional(),
      }),
    ], { required_error: 'Recipient string or object is required' }),
    data: z.record(z.any()).optional().default({}),
  }),
});

const getEventSchema = z.object({
  params: z.object({
    eventId: z.string().uuid('Invalid Event ID format'),
  }),
});

module.exports = {
  ingestEventSchema,
  getEventSchema,
};
