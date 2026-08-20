const { Router } = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const organizationRoutes = require('../modules/organizations/organization.routes');
const projectRoutes = require('../modules/projects/project.routes');
const apiKeyRoutes = require('../modules/api-keys/api-key.routes');
const templateRoutes = require('../modules/templates/template.routes');

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Module routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/organizations/:organizationId/projects', projectRoutes);
router.use('/projects/:projectId/api-keys', apiKeyRoutes);
router.use('/projects/:projectId/templates', templateRoutes);

module.exports = router;
