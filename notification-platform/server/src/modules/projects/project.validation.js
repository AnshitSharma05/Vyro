const { z } = require('zod');

const createProjectSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid Organization ID format'),
  }),
  body: z.object({
    name: z
      .string({ required_error: 'Project name is required' })
      .min(2, 'Project name must be at least 2 characters long')
      .max(100, 'Project name cannot exceed 100 characters')
      .trim(),
  }),
});

const listProjectsSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid Organization ID format'),
  }),
});

const getProjectSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid Organization ID format'),
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
});

const updateProjectSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid('Invalid Organization ID format'),
    projectId: z.string().uuid('Invalid Project ID format'),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Project name must be at least 2 characters long')
      .max(100, 'Project name cannot exceed 100 characters')
      .trim()
      .optional(),
  }),
});

module.exports = {
  createProjectSchema,
  listProjectsSchema,
  getProjectSchema,
  updateProjectSchema,
};
