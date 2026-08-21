const { z } = require('zod');

const createRecipientSchema = z.object({
  body: z.object({
    externalUserId: z
      .string({ required_error: 'externalUserId is required' })
      .min(1, 'externalUserId cannot be empty')
      .trim(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().optional(),
  }),
});

const updateRecipientSchema = z.object({
  params: z.object({
    externalUserId: z.string().min(1, 'externalUserId is required'),
  }),
  body: z.object({
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().optional(),
  }),
});

const getRecipientSchema = z.object({
  params: z.object({
    externalUserId: z.string().min(1, 'externalUserId is required'),
  }),
});

module.exports = {
  createRecipientSchema,
  updateRecipientSchema,
  getRecipientSchema,
};
