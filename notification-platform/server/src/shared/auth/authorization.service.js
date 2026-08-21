const { hasPermission, PERMISSIONS } = require('./permissions');
const organizationRepository = require('../../modules/organizations/organization.repository');
const AuthorizationError = require('../errors/authorization-error');
const ConflictError = require('../errors/conflict-error');

class AuthorizationService {
  /**
   * Verifies if a user role possesses the required permission.
   *
   * @param {string} role
   * @param {string} permission
   * @throws {AuthorizationError}
   */
  enforcePermission(role, permission) {
    if (!hasPermission(role, permission)) {
      throw new AuthorizationError('You do not have permission to perform this action');
    }
  }

  /**
   * Enforces role management hierarchy rules and last owner protection when updating a member's role.
   */
  async validateRoleUpdate({ organizationId, actorUserId, actorRole, targetMemberId, newRole }) {
    // 1. Enforce MEMBER_MANAGE permission for actor
    this.enforcePermission(actorRole, PERMISSIONS.MEMBERS_MANAGE);

    // 2. Fetch target member
    const targetMember = await organizationRepository.findMemberById(targetMemberId);
    if (!targetMember || targetMember.organizationId !== organizationId) {
      throw new AuthorizationError('Member not found in organization');
    }

    // 3. Only OWNER can promote a member to OWNER or demote an OWNER
    if (newRole === 'OWNER' || targetMember.role === 'OWNER') {
      if (actorRole !== 'OWNER') {
        throw new AuthorizationError('Only organization Owners can manage Owner roles');
      }
    }

    // 4. Last Owner Protection: Cannot demote the sole OWNER of an organization
    if (targetMember.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await organizationRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new ConflictError('Cannot demote the sole Owner of an organization', null, 'LAST_OWNER_PROTECTION');
      }
    }
  }

  /**
   * Enforces member removal rules and last owner protection when deleting an organization member.
   */
  async validateMemberRemoval({ organizationId, actorUserId, actorRole, targetMemberId }) {
    // 1. Enforce MEMBERS_MANAGE permission for actor
    this.enforcePermission(actorRole, PERMISSIONS.MEMBERS_MANAGE);

    // 2. Fetch target member
    const targetMember = await organizationRepository.findMemberById(targetMemberId);
    if (!targetMember || targetMember.organizationId !== organizationId) {
      throw new AuthorizationError('Member not found in organization');
    }

    // 3. Admin cannot remove an Owner
    if (targetMember.role === 'OWNER' && actorRole !== 'OWNER') {
      throw new AuthorizationError('Only organization Owners can remove an Owner');
    }

    // 4. Last Owner Protection: Cannot remove the sole OWNER of an organization
    if (targetMember.role === 'OWNER') {
      const ownerCount = await organizationRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new ConflictError('Cannot remove the sole Owner of an organization', null, 'LAST_OWNER_PROTECTION');
      }
    }
  }
}

module.exports = new AuthorizationService();
