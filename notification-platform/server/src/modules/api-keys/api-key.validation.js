const { z } = require('zod');

const createApiKeySchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
  body: z.object({
    name: z
      .string({ required_error: 'API key name is required' })
      .min(1, 'API key name cannot be empty')
      .max(100, 'API key name cannot exceed 100 characters')
      .trim(),
    expiresAt: z.string().datetime({ message: 'Invalid expiration date format' }).optional(),
    scopes: z.array(z.string()).optional().default([]),
  }),
});

const listApiKeysSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
});

const revokeApiKeySchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
    apiKeyId: z.string().uuid('Invalid API Key ID format'),
  }),
});

module.exports = {
  createApiKeySchema,
  listApiKeysSchema,
  revokeApiKeySchema,
};
