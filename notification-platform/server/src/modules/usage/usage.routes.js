const { Router } = require('express');
const usageController = require('./usage.controller');
const authenticate = require('../../middlewares/auth.middleware');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const { requireScope } = require('../../middlewares/require-scope.middleware');
const { API_KEY_SCOPES } = require('../../shared/auth/scopes');

const router = Router();

// Machine API Key route
router.get(
  '/summary',
  authenticateApiKey,
  requireScope(API_KEY_SCOPES.USAGE_READ),
  usageController.getSummaryMachine
);

// Human JWT Dashboard routes
router.get(
  '/organizations/:organizationId/summary',
  authenticate,
  usageController.getSummaryDashboard
);

router.get(
  '/organizations/:organizationId/history',
  authenticate,
  usageController.getHistoryDashboard
);

module.exports = router;
