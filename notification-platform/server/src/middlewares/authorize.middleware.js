const organizationRepository = require('../modules/organizations/organization.repository');
const projectRepository = require('../modules/projects/project.repository');
const { hasPermission } = require('../shared/auth/permissions');
const AuthorizationError = require('../shared/errors/authorization-error');
const NotFoundError = require('../shared/errors/not-found-error');
const asyncHandler = require('../shared/utils/async-handler');

/**
 * Middleware factory enforcing JWT human user permission for specified route.
 *
 * @param {string} requiredPermission
 */
const requirePermission = (requiredPermission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AuthorizationError('Authentication required');
    }

    const userId = req.user.id;
    let organizationId = req.params.organizationId;

    // Resolve organization ID from project ID if present in request params
    if (!organizationId && req.params.projectId) {
      const project = await projectRepository.findProjectById(req.params.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }
      organizationId = project.organizationId;
      req.project = project;
    }

    if (!organizationId) {
      throw new AuthorizationError('Organization context required for permission check');
    }

    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError('You are not a member of this organization');
    }

    req.membership = membership;
    req.role = membership.role;

    if (!hasPermission(membership.role, requiredPermission)) {
      throw new AuthorizationError('You do not have permission to perform this action');
    }

    next();
  });
};

module.exports = {
  requirePermission,
};
