const { Router } = require('express');
const notificationController = require('./notification.controller');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  sendNotificationSchema,
  listNotificationsSchema,
  getNotificationSchema,
} = require('./notification.validation');

const router = Router();

// Machine-to-machine endpoints authenticated via X-API-Key header
router.use(authenticateApiKey);

router.post('/send', validate(sendNotificationSchema), notificationController.send);
router.get('/', validate(listNotificationsSchema), notificationController.listMachine);
router.get('/:notificationId', validate(getNotificationSchema), notificationController.getMachine);

module.exports = router;
