const { Router } = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const organizationRoutes = require('../modules/organizations/organization.routes');
const projectRoutes = require('../modules/projects/project.routes');
const apiKeyRoutes = require('../modules/api-keys/api-key.routes');
const templateRoutes = require('../modules/templates/template.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const webhookRoutes = require('../modules/webhooks/webhook.routes');
const providerWebhookRoutes = require('../modules/webhooks/provider-webhook.routes');
const analyticsRoutes = require('../modules/analytics/analytics.routes');
const notificationController = require('../modules/notifications/notification.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { listNotificationsSchema, getNotificationSchema, cancelNotificationSchema } = require('../modules/notifications/notification.validation');

const recipientRoutes = require('../modules/recipients/recipient.routes');
const preferenceRoutes = require('../modules/preferences/preference.routes');
const deviceRoutes = require('../modules/devices/device.routes');

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
router.use('/projects/:projectId/webhooks', webhookRoutes);
router.use('/analytics', analyticsRoutes);

// Recipient, Preference & Device Machine API Routes (X-API-Key authenticated)
router.use('/recipients', recipientRoutes);
router.use('/recipients', preferenceRoutes);
router.use('/recipients', deviceRoutes);

// Unauthenticated Inbound Provider Webhook Callback Routes
router.use('/webhooks', providerWebhookRoutes);

// Machine-to-machine notification routes (X-API-Key authenticated)
router.use('/notifications', notificationRoutes);

// Dashboard human notification routes (JWT authenticated)
router.get(
  '/projects/:projectId/notifications',
  authenticate,
  validate(listNotificationsSchema),
  notificationController.listDashboard
);
router.get(
  '/projects/:projectId/notifications/:notificationId',
  authenticate,
  validate(getNotificationSchema),
  notificationController.getDashboard
);
router.post(
  '/projects/:projectId/notifications/:notificationId/cancel',
  authenticate,
  validate(cancelNotificationSchema),
  notificationController.cancelDashboard
);

module.exports = router;
