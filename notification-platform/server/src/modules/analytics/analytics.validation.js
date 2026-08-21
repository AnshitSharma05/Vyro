const { z } = require('zod');

const analyticsOverviewSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    range: z.enum(['today', '7d', '30d', 'this_month', 'custom']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const organizationAnalyticsSchema = z.object({
  query: z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
    range: z.enum(['today', '7d', '30d', 'this_month', 'custom']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

module.exports = {
  analyticsOverviewSchema,
  organizationAnalyticsSchema,
};
