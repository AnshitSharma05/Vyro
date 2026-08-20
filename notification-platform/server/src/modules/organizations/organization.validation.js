const { z } = require('zod');

const createOrganizationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Organization name is required' })
      .min(2, 'Organization name must be at least 2 characters long')
      .max(100, 'Organization name cannot exceed 100 characters')
      .trim(),
  }),
});

const updateOrganizationSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid Organization ID format'),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Organization name must be at least 2 characters long')
      .max(100, 'Organization name cannot exceed 100 characters')
      .trim()
      .optional(),
  }),
});

const organizationIdParamSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid Organization ID format'),
  }),
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdParamSchema,
};
