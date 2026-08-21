const { z } = require('zod');

const createWebhookSchema = z.object({
  body: z.object({
    url: z.string().min(1, 'Webhook URL is required').url('Must be a valid URL'),
  }),
});

const updateWebhookSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    webhookId: z.string().uuid('Invalid webhook ID'),
  }),
  body: z.object({
    url: z.string().url('Must be a valid URL').optional(),
    active: z.boolean().optional(),
  }),
});

const webhookParamSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    webhookId: z.string().uuid('Invalid webhook ID'),
  }),
});

const listDeliveriesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    webhookId: z.string().uuid('Invalid webhook ID'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

module.exports = {
  createWebhookSchema,
  updateWebhookSchema,
  webhookParamSchema,
  listDeliveriesSchema,
};
