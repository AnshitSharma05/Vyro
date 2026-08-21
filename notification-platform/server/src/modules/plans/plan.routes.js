const { Router } = require('express');
const planController = require('./plan.controller');
const authenticate = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const { authorizeMember } = require('../../middlewares/authorize.middleware');
const { PERMISSIONS } = require('../../shared/auth/permissions');
const { changePlanSchema } = require('./plan.validation');

const router = Router();

router.get('/', planController.list);

router.post(
  '/organizations/:organizationId/plan',
  authenticate,
  authorizeMember(PERMISSIONS.ORGANIZATION_UPDATE),
  validate(changePlanSchema),
  planController.changePlan
);

module.exports = router;
