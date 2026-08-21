const { z } = require('zod');

const changePlanSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid Organization ID format'),
  }),
  body: z.object({
    planCode: z.enum(['FREE', 'PRO', 'BUSINESS'], {
      required_error: 'planCode is required (FREE, PRO, BUSINESS)',
    }),
  }),
});

module.exports = {
  changePlanSchema,
};
