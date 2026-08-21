const { Router } = require('express');
const eventController = require('./event.controller');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const validate = require('../../middlewares/validation.middleware');
const { requireScope } = require('../../middlewares/require-scope.middleware');
const { API_KEY_SCOPES } = require('../../shared/auth/scopes');
const {
  ingestEventSchema,
  getEventSchema,
} = require('./event.validation');

const router = Router();

router.use(authenticateApiKey);

router.post(
  '/',
  requireScope(API_KEY_SCOPES.EVENTS_WRITE),
  validate(ingestEventSchema),
  eventController.ingest
);

router.get(
  '/',
  requireScope(API_KEY_SCOPES.EVENTS_READ),
  eventController.list
);

router.get(
  '/:eventId',
  requireScope(API_KEY_SCOPES.EVENTS_READ),
  validate(getEventSchema),
  eventController.get
);

module.exports = router;
