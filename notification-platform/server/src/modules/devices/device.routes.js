const { Router } = require('express');
const deviceController = require('./device.controller');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const validate = require('../../middlewares/validation.middleware');
const { requireScope } = require('../../middlewares/require-scope.middleware');
const { API_KEY_SCOPES } = require('../../shared/auth/scopes');
const {
  registerDeviceSchema,
  listDevicesSchema,
  deactivateDeviceSchema,
} = require('./device.validation');

const router = Router();

router.use(authenticateApiKey);

router.post(
  '/:externalUserId/devices',
  requireScope(API_KEY_SCOPES.DEVICES_WRITE),
  validate(registerDeviceSchema),
  deviceController.register
);

router.get(
  '/:externalUserId/devices',
  requireScope(API_KEY_SCOPES.DEVICES_READ),
  validate(listDevicesSchema),
  deviceController.list
);

router.delete(
  '/:externalUserId/devices/:deviceId',
  requireScope(API_KEY_SCOPES.DEVICES_WRITE),
  validate(deactivateDeviceSchema),
  deviceController.deactivate
);

module.exports = router;
