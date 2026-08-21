const { Router } = require('express');
const notificationController = require('./notification.controller');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  sendNotificationSchema,
  listNotificationsSchema,
  getNotificationSchema,
  cancelNotificationSchema,
} = require('./notification.validation');
const { rateLimitProjectNotification } = require('../../middlewares/rate-limit.middleware');
const { requireScope } = require('../../middlewares/require-scope.middleware');
const { API_KEY_SCOPES } = require('../../shared/auth/scopes');

const router = Router();

// Machine-to-machine endpoints authenticated via X-API-Key header
router.use(authenticateApiKey);

router.post(
  '/send',
  rateLimitProjectNotification,
  requireScope(API_KEY_SCOPES.NOTIFICATIONS_SEND),
  validate(sendNotificationSchema),
  notificationController.send
);

router.get(
  '/',
  requireScope(API_KEY_SCOPES.NOTIFICATIONS_READ),
  validate(listNotificationsSchema),
  notificationController.listMachine
);

router.get(
  '/:notificationId',
  requireScope(API_KEY_SCOPES.NOTIFICATIONS_READ),
  validate(getNotificationSchema),
  notificationController.getMachine
);

router.post(
  '/:notificationId/cancel',
  requireScope(API_KEY_SCOPES.NOTIFICATIONS_CANCEL),
  validate(cancelNotificationSchema),
  notificationController.cancelMachine
);

module.exports = router;
