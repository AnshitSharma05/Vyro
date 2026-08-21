const { z } = require('zod');

const updatePreferencesSchema = z.object({
  params: z.object({
    externalUserId: z.string().min(1, 'externalUserId is required'),
  }),
  body: z.object({
    preferences: z.record(
      z.enum(['TRANSACTIONAL', 'SECURITY', 'MARKETING', 'SYSTEM']),
      z.record(z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']), z.boolean())
    ),
  }),
});

const getPreferencesSchema = z.object({
  params: z.object({
    externalUserId: z.string().min(1, 'externalUserId is required'),
  }),
});

module.exports = {
  updatePreferencesSchema,
  getPreferencesSchema,
};
