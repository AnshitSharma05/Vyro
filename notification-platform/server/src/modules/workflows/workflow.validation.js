const { z } = require('zod');

const EVENT_NAME_REGEX = /^[A-Z0-9_:-]+$/i;

const actionSchema = z.object({
  order: z.number().int().min(1).optional(),
  channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'], {
    required_error: 'Action channel is required',
  }),
  category: z.enum(['TRANSACTIONAL', 'SECURITY', 'MARKETING', 'SYSTEM']).optional().default('TRANSACTIONAL'),
  template: z.string({ required_error: 'Action template is required' }).trim().min(1),
  delaySeconds: z.number().int().min(0).max(31536000).optional().default(0),
});

const createWorkflowSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Workflow name is required' }).min(1).max(100).trim(),
    description: z.string().max(255).optional(),
    eventName: z
      .string({ required_error: 'eventName is required' })
      .min(1)
      .max(100)
      .regex(EVENT_NAME_REGEX, 'eventName must contain only alphanumeric characters, underscores, colons, or hyphens'),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
    actions: z.array(actionSchema).min(1, 'Workflow must contain at least one action'),
  }),
});

const updateWorkflowSchema = z.object({
  params: z.object({
    workflowId: z.string().uuid('Invalid Workflow ID format'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    description: z.string().max(255).optional(),
    eventName: z.string().regex(EVENT_NAME_REGEX).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    actions: z.array(actionSchema).min(1).optional(),
  }),
});

const getWorkflowSchema = z.object({
  params: z.object({
    workflowId: z.string().uuid('Invalid Workflow ID format'),
  }),
});

module.exports = {
  createWorkflowSchema,
  updateWorkflowSchema,
  getWorkflowSchema,
};
