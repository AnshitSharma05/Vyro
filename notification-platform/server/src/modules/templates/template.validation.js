const { z } = require('zod');

const channelEnum = z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'], {
  required_error: 'Template channel is required',
  invalid_type_error: 'Channel must be EMAIL, SMS, WHATSAPP, or PUSH',
});

const createTemplateSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
  body: z
    .object({
      name: z
        .string({ required_error: 'Template name is required' })
        .trim()
        .min(1, 'Template name cannot be empty')
        .max(100, 'Template name cannot exceed 100 characters')
        .regex(/^[a-z0-9-]+$/, 'Template name must contain only lowercase letters, numbers, and hyphens'),
      channel: channelEnum,
      subject: z.string().trim().min(1, 'Subject cannot be empty').max(200).optional().nullable(),
      body: z
        .string({ required_error: 'Template body is required' })
        .min(1, 'Template body cannot be empty'),
    })
    .superRefine((data, ctx) => {
      if (data.channel === 'EMAIL' && (!data.subject || !data.subject.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subject is required for EMAIL channel',
          path: ['subject'],
        });
      }
      if (data.channel !== 'EMAIL' && data.subject && data.subject.trim() !== '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subject is only supported for EMAIL channel',
          path: ['subject'],
        });
      }
    }),
});

const updateTemplateSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
    templateId: z.string().uuid('Invalid Template ID format'),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Template name cannot be empty')
        .max(100, 'Template name cannot exceed 100 characters')
        .regex(/^[a-z0-9-]+$/, 'Template name must contain only lowercase letters, numbers, and hyphens')
        .optional(),
      subject: z.string().trim().min(1, 'Subject cannot be empty').max(200).optional().nullable(),
      body: z.string().min(1, 'Template body cannot be empty').optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field (name, subject, or body) must be updated',
    }),
});

const listTemplatesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']).optional(),
  }),
});

const getTemplateSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
    templateId: z.string().uuid('Invalid Template ID format'),
  }),
});

const deleteTemplateSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
    templateId: z.string().uuid('Invalid Template ID format'),
  }),
});

const previewTemplateSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
  body: z.object({
    templateId: z.string().uuid('Invalid Template ID format').optional(),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']).optional(),
    subject: z.string().optional().nullable(),
    body: z.string().optional(),
    data: z.record(z.any(), { required_error: 'Sample data object is required' }).default({}),
  }),
});

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesSchema,
  getTemplateSchema,
  deleteTemplateSchema,
  previewTemplateSchema,
};
