const { Router } = require('express');
const preferenceController = require('./preference.controller');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const validate = require('../../middlewares/validation.middleware');
const { requireScope } = require('../../middlewares/require-scope.middleware');
const { API_KEY_SCOPES } = require('../../shared/auth/scopes');
const {
  updatePreferencesSchema,
  getPreferencesSchema,
} = require('./preference.validation');

const router = Router();

router.use(authenticateApiKey);

router.get(
  '/:externalUserId/preferences',
  requireScope(API_KEY_SCOPES.PREFERENCES_READ),
  validate(getPreferencesSchema),
  preferenceController.get
);

router.put(
  '/:externalUserId/preferences',
  requireScope(API_KEY_SCOPES.PREFERENCES_WRITE),
  validate(updatePreferencesSchema),
  preferenceController.update
);

module.exports = router;
