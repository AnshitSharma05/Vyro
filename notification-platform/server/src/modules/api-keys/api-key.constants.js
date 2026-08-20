const API_KEY_PREFIX = 'np_live_';
const PUBLIC_PREFIX_LENGTH = 8;
const SECRET_BYTES = 32;

const API_KEY_MESSAGES = {
  CREATED: 'API key created successfully',
  REVOKED: 'API key revoked successfully',
  NOT_FOUND: 'API key not found',
  INSUFFICIENT_PERMISSIONS: 'Only organization OWNER or ADMIN can perform this action',
  ORGANIZATION_FORBIDDEN: 'You are not a member of the organization that owns this project',
  PROJECT_NOT_FOUND: 'Project not found',
  INVALID_KEY_FORMAT: 'Invalid API key format',
  KEY_REQUIRED: 'API key is required',
  INVALID_KEY: 'Invalid API key',
  KEY_REVOKED: 'API key has been revoked',
  KEY_EXPIRED: 'API key has expired',
};

module.exports = {
  API_KEY_PREFIX,
  PUBLIC_PREFIX_LENGTH,
  SECRET_BYTES,
  API_KEY_MESSAGES,
};
