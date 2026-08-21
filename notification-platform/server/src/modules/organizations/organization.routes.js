const { Router } = require('express');
const organizationController = require('./organization.controller');
const authenticate = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdParamSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} = require('./organization.validation');

const router = Router();

router.use(authenticate);

router.post('/', validate(createOrganizationSchema), organizationController.create);
router.get('/', organizationController.list);
router.get('/:organizationId', validate(organizationIdParamSchema), organizationController.get);
router.patch('/:organizationId', validate(updateOrganizationSchema), organizationController.update);
router.get('/:organizationId/members', validate(organizationIdParamSchema), organizationController.listMembers);
router.patch('/:organizationId/members/:memberId/role', validate(updateMemberRoleSchema), organizationController.updateMemberRole);
router.delete('/:organizationId/members/:memberId', validate(removeMemberSchema), organizationController.removeMember);

module.exports = router;
