const { z } = require('zod');

const getUsageQuerySchema = z.object({
  query: z.object({
    organizationId: z.string().uuid().optional(),
  }),
});

module.exports = {
  getUsageQuerySchema,
};
