const templateRepository = require('./template.repository');
const projectRepository = require('../projects/project.repository');
const organizationRepository = require('../organizations/organization.repository');
const templateRenderer = require('./template.renderer');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');
const ConflictError = require('../../shared/errors/conflict-error');
const ValidationError = require('../../shared/errors/validation-error');
const { TEMPLATE_MESSAGES } = require('./template.constants');

class TemplateService {
  async createTemplate({ projectId, name, channel, subject, body, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(TEMPLATE_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(TEMPLATE_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(TEMPLATE_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const existing = await templateRepository.findByNameAndProjectId(name, projectId);
    if (existing) {
      throw new ConflictError(TEMPLATE_MESSAGES.DUPLICATE_NAME);
    }

    if (channel === 'EMAIL' && (!subject || !subject.trim())) {
      throw new ValidationError(TEMPLATE_MESSAGES.SUBJECT_REQUIRED_FOR_EMAIL);
    }

    if (channel !== 'EMAIL' && subject && subject.trim() !== '') {
      throw new ValidationError(TEMPLATE_MESSAGES.SUBJECT_NOT_ALLOWED);
    }

    const template = await templateRepository.create({
      projectId,
      name,
      channel,
      subject,
      body,
    });

    const variables = Array.from(
      new Set([
        ...templateRenderer.extractVariables(template.subject),
        ...templateRenderer.extractVariables(template.body),
      ])
    );

    return {
      ...template,
      variables,
    };
  }

  async listTemplates({ projectId, page = 1, limit = 20, channel, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(TEMPLATE_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(TEMPLATE_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    const result = await templateRepository.findManyByProjectId({
      projectId,
      page,
      limit,
      channel,
    });

    const templatesWithVariables = result.templates.map((tpl) => ({
      ...tpl,
      variables: Array.from(
        new Set([
          ...templateRenderer.extractVariables(tpl.subject),
          ...templateRenderer.extractVariables(tpl.body),
        ])
      ),
    }));

    return {
      ...result,
      templates: templatesWithVariables,
    };
  }

  async getTemplate({ projectId, templateId, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(TEMPLATE_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(TEMPLATE_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    const template = await templateRepository.findByIdAndProjectId(templateId, projectId);
    if (!template) {
      throw new NotFoundError(TEMPLATE_MESSAGES.NOT_FOUND);
    }

    const variables = Array.from(
      new Set([
        ...templateRenderer.extractVariables(template.subject),
        ...templateRenderer.extractVariables(template.body),
      ])
    );

    return {
      ...template,
      variables,
    };
  }

  async updateTemplate({ projectId, templateId, updateData, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(TEMPLATE_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(TEMPLATE_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(TEMPLATE_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const template = await templateRepository.findByIdAndProjectId(templateId, projectId);
    if (!template) {
      throw new NotFoundError(TEMPLATE_MESSAGES.NOT_FOUND);
    }

    if (updateData.name && updateData.name !== template.name) {
      const existing = await templateRepository.findByNameAndProjectId(updateData.name, projectId);
      if (existing) {
        throw new ConflictError(TEMPLATE_MESSAGES.DUPLICATE_NAME);
      }
    }

    if (template.channel === 'EMAIL') {
      if (updateData.subject !== undefined && (!updateData.subject || !updateData.subject.trim())) {
        throw new ValidationError(TEMPLATE_MESSAGES.SUBJECT_REQUIRED_FOR_EMAIL);
      }
    } else {
      if (updateData.subject && updateData.subject.trim() !== '') {
        throw new ValidationError(TEMPLATE_MESSAGES.SUBJECT_NOT_ALLOWED);
      }
    }

    const updated = await templateRepository.update(templateId, updateData);

    const variables = Array.from(
      new Set([
        ...templateRenderer.extractVariables(updated.subject),
        ...templateRenderer.extractVariables(updated.body),
      ])
    );

    return {
      ...updated,
      variables,
    };
  }

  async deleteTemplate({ projectId, templateId, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(TEMPLATE_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(TEMPLATE_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(TEMPLATE_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const template = await templateRepository.findByIdAndProjectId(templateId, projectId);
    if (!template) {
      throw new NotFoundError(TEMPLATE_MESSAGES.NOT_FOUND);
    }

    return templateRepository.delete(templateId);
  }

  async previewTemplate({ projectId, templateId, subject, body, data = {}, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(TEMPLATE_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(TEMPLATE_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    let targetSubject = subject;
    let targetBody = body;

    if (templateId) {
      const template = await templateRepository.findByIdAndProjectId(templateId, projectId);
      if (!template) {
        throw new NotFoundError(TEMPLATE_MESSAGES.NOT_FOUND);
      }
      targetSubject = template.subject;
      targetBody = template.body;
    }

    if (!targetBody || typeof targetBody !== 'string') {
      throw new ValidationError('Template body is required for preview');
    }

    const rendered = templateRenderer.renderTemplate(
      { subject: targetSubject, body: targetBody },
      data
    );

    return {
      ...rendered,
      providedData: data,
    };
  }
}

module.exports = new TemplateService();
