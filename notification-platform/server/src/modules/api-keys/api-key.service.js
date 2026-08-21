const apiKeyRepository = require('./api-key.repository');
const projectRepository = require('../projects/project.repository');
const organizationRepository = require('../organizations/organization.repository');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');
const { API_KEY_MESSAGES } = require('./api-key.constants');
const { generateApiKey, hashApiKey } = require('./api-key.utils');

const { validateScopes } = require('../../shared/auth/scopes');
const ValidationError = require('../../shared/errors/validation-error');

class ApiKeyService {
  async createApiKey({ projectId, name, expiresAt, scopes = [], userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(API_KEY_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(API_KEY_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(API_KEY_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    // Validate requested scopes if present
    if (scopes && scopes.length > 0) {
      const scopeCheck = validateScopes(scopes);
      if (!scopeCheck.valid) {
        throw new ValidationError(
          `Invalid API key scopes: ${scopeCheck.invalidScopes.join(', ')}`,
          null,
          'INVALID_SCOPES'
        );
      }
    }

    const { rawKey, keyPrefix } = generateApiKey();
    const keyHash = hashApiKey(rawKey);

    const apiKeyRecord = await apiKeyRepository.create({
      projectId,
      name,
      keyPrefix,
      keyHash,
      expiresAt,
      scopes,
    });

    return {
      ...apiKeyRecord,
      key: rawKey,
    };
  }

  async listApiKeys({ projectId, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(API_KEY_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(API_KEY_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    return apiKeyRepository.findByProjectId(projectId);
  }

  async revokeApiKey({ projectId, apiKeyId, userId }) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(API_KEY_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(API_KEY_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AuthorizationError(API_KEY_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    const apiKey = await apiKeyRepository.findByIdAndProjectId(apiKeyId, projectId);
    if (!apiKey) {
      throw new NotFoundError(API_KEY_MESSAGES.NOT_FOUND);
    }

    return apiKeyRepository.revoke(apiKeyId);
  }
}

module.exports = new ApiKeyService();
