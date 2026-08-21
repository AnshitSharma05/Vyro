const { Router } = require('express');
const workflowController = require('./workflow.controller');
const authenticateApiKey = require('../../middlewares/api-key.middleware');
const validate = require('../../middlewares/validation.middleware');
const { requireScope } = require('../../middlewares/require-scope.middleware');
const { API_KEY_SCOPES } = require('../../shared/auth/scopes');
const {
  createWorkflowSchema,
  updateWorkflowSchema,
  getWorkflowSchema,
} = require('./workflow.validation');

const router = Router();

router.use(authenticateApiKey);

router.post(
  '/',
  requireScope(API_KEY_SCOPES.WORKFLOWS_WRITE),
  validate(createWorkflowSchema),
  workflowController.create
);

router.get(
  '/',
  requireScope(API_KEY_SCOPES.WORKFLOWS_READ),
  workflowController.list
);

router.get(
  '/:workflowId',
  requireScope(API_KEY_SCOPES.WORKFLOWS_READ),
  validate(getWorkflowSchema),
  workflowController.get
);

router.patch(
  '/:workflowId',
  requireScope(API_KEY_SCOPES.WORKFLOWS_WRITE),
  validate(updateWorkflowSchema),
  workflowController.update
);

router.delete(
  '/:workflowId',
  requireScope(API_KEY_SCOPES.WORKFLOWS_WRITE),
  validate(getWorkflowSchema),
  workflowController.delete
);

module.exports = router;
