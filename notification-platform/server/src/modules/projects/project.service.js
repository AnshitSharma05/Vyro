const projectRepository = require('./project.repository');
const organizationRepository = require('../organizations/organization.repository');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');
const { PROJECT_MESSAGES } = require('./project.constants');

class ProjectService {
  generateSlug(name) {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'project'
    );
  }

  async resolveUniqueSlug(organizationId, baseSlug) {
    let slug = baseSlug;
    let counter = 1;

    while (await projectRepository.findByOrganizationIdAndSlug(organizationId, slug)) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  async createProject({ organizationId, name, userId }) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(PROJECT_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(PROJECT_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const quotaService = require('../../shared/quotas/quota.service');
    await quotaService.checkResourceQuota(organizationId, 'PROJECTS');

    const baseSlug = this.generateSlug(name);
    const slug = await this.resolveUniqueSlug(organizationId, baseSlug);

    return projectRepository.create({
      organizationId,
      name,
      slug,
    });
  }

  async listProjects({ organizationId, userId }) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(PROJECT_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    return projectRepository.findProjectsByOrganizationId(organizationId);
  }

  async getProject({ organizationId, projectId, userId }) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(PROJECT_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    const project = await projectRepository.findProjectByIdAndOrganizationId(projectId, organizationId);
    if (!project) {
      throw new NotFoundError(PROJECT_MESSAGES.NOT_FOUND);
    }

    return project;
  }

  async updateProject({ organizationId, projectId, userId, updateData }) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(PROJECT_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(PROJECT_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const project = await projectRepository.findProjectByIdAndOrganizationId(projectId, organizationId);
    if (!project) {
      throw new NotFoundError(PROJECT_MESSAGES.NOT_FOUND);
    }

    const dataToUpdate = {};
    if (updateData.name && updateData.name !== project.name) {
      dataToUpdate.name = updateData.name;
      const baseSlug = this.generateSlug(updateData.name);
      dataToUpdate.slug = await this.resolveUniqueSlug(organizationId, baseSlug);
    }

    return projectRepository.update(projectId, dataToUpdate);
  }
}

module.exports = new ProjectService();
