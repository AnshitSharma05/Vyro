const organizationRepository = require('./organization.repository');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');
const ConflictError = require('../../shared/errors/conflict-error');
const { ORGANIZATION_MESSAGES } = require('./organization.constants');

class OrganizationService {
  generateSlug(name) {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'organization'
    );
  }

  async resolveUniqueSlug(baseSlug) {
    let slug = baseSlug;
    let counter = 1;

    while (await organizationRepository.findBySlug(slug)) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  async createOrganization({ name, userId }) {
    const baseSlug = this.generateSlug(name);
    const slug = await this.resolveUniqueSlug(baseSlug);

    return organizationRepository.createWithMember({
      name,
      slug,
      userId,
    });
  }

  async getUserOrganizations(userId) {
    return organizationRepository.findUserOrganizations(userId);
  }

  async getOrganization(organizationId, userId) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(ORGANIZATION_MESSAGES.FORBIDDEN);
    }

    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError(ORGANIZATION_MESSAGES.NOT_FOUND);
    }

    return {
      ...organization,
      userRole: membership.role,
    };
  }

  async updateOrganization(organizationId, userId, updateData) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(ORGANIZATION_MESSAGES.FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(ORGANIZATION_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError(ORGANIZATION_MESSAGES.NOT_FOUND);
    }

    const dataToUpdate = {};
    if (updateData.name && updateData.name !== organization.name) {
      dataToUpdate.name = updateData.name;
      const baseSlug = this.generateSlug(updateData.name);
      dataToUpdate.slug = await this.resolveUniqueSlug(baseSlug);
    }

    return organizationRepository.update(organizationId, dataToUpdate);
  }

  async getOrganizationMembers(organizationId, userId) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(ORGANIZATION_MESSAGES.FORBIDDEN);
    }

    const members = await organizationRepository.findMembers(organizationId);
    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }
}

module.exports = new OrganizationService();
