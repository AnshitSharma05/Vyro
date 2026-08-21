const { Router } = require('express');
const recipientController = require('./recipient.controller');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const validate = require('../../middlewares/validation.middleware');
const { requireScope } = require('../../middlewares/require-scope.middleware');
const { API_KEY_SCOPES } = require('../../shared/auth/scopes');
const {
  createRecipientSchema,
  updateRecipientSchema,
  getRecipientSchema,
} = require('./recipient.validation');

const router = Router();

router.use(authenticateApiKey);

router.post(
  '/',
  requireScope(API_KEY_SCOPES.RECIPIENTS_WRITE),
  validate(createRecipientSchema),
  recipientController.create
);

router.get(
  '/',
  requireScope(API_KEY_SCOPES.RECIPIENTS_READ),
  recipientController.list
);

router.get(
  '/:externalUserId',
  requireScope(API_KEY_SCOPES.RECIPIENTS_READ),
  validate(getRecipientSchema),
  recipientController.get
);

router.put(
  '/:externalUserId',
  requireScope(API_KEY_SCOPES.RECIPIENTS_WRITE),
  validate(updateRecipientSchema),
  recipientController.update
);

module.exports = router;
