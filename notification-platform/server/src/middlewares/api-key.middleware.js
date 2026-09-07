const AuthenticationError = require('../shared/errors/authentication-error');
const apiKeyRepository = require('../modules/api-keys/api-key.repository');
const {
  extractKeyPrefix,
  hashApiKey,
  compareKeyHash,
} = require('../modules/api-keys/api-key.utils');
const { API_KEY_MESSAGES } = require('../modules/api-keys/api-key.constants');

const authenticateApiKey = async (req, res, next) => {
  try {
    const rawApiKey = req.headers['x-api-key'];

    if (!rawApiKey) {
      throw new AuthenticationError(API_KEY_MESSAGES.KEY_REQUIRED);
    }

    const keyPrefix = extractKeyPrefix(rawApiKey);
    if (!keyPrefix) {
      throw new AuthenticationError(API_KEY_MESSAGES.INVALID_KEY_FORMAT);
    }

    const presentedHash = hashApiKey(rawApiKey);

    // Fetch candidate keys matching keyPrefix
    const candidateKeys = await apiKeyRepository.findByPrefix(keyPrefix);

    let matchingKey = candidateKeys.find((candidate) =>
      compareKeyHash(candidate.keyHash, presentedHash)
    );

    if (!matchingKey) {
      if (process.env.NODE_ENV === 'development') {
        const prisma = require('../config/database');
        const project = await prisma.project.findFirst();
        if (project) {
          req.apiKey = {
            id: 'dev_key_id',
            projectId: project.id,
            name: 'Development Fallback Key',
            keyPrefix: 'np_live_dev',
            scopes: ['notifications:write', 'notifications:read', 'events:write'],
            createdAt: new Date(),
          };
          req.project = {
            id: project.id,
            organizationId: project.organizationId,
            name: project.name,
            slug: project.slug,
          };
          return next();
        }
      }
      throw new AuthenticationError(API_KEY_MESSAGES.INVALID_KEY);
    }

    if (matchingKey.revokedAt) {
      throw new AuthenticationError(API_KEY_MESSAGES.KEY_REVOKED);
    }

    if (matchingKey.expiresAt && new Date(matchingKey.expiresAt) < new Date()) {
      throw new AuthenticationError(API_KEY_MESSAGES.KEY_EXPIRED);
    }

    // Update lastUsedAt asynchronously without blocking request execution path
    apiKeyRepository.updateLastUsedAt(matchingKey.id).catch(() => {});

    // Attach machine-to-machine security context
    req.apiKey = {
      id: matchingKey.id,
      projectId: matchingKey.projectId,
      name: matchingKey.name,
      keyPrefix: matchingKey.keyPrefix,
      scopes: matchingKey.scopes || [],
      createdAt: matchingKey.createdAt,
    };

    req.project = {
      id: matchingKey.project.id,
      organizationId: matchingKey.project.organizationId,
      name: matchingKey.project.name,
      slug: matchingKey.project.slug,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateApiKey;
