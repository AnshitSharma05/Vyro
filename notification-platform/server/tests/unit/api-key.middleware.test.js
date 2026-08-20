const authenticateApiKey = require('../../src/middlewares/api-key.middleware');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const AuthenticationError = require('../../src/shared/errors/authentication-error');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

jest.mock('../../src/modules/api-keys/api-key.repository');

describe('ApiKey Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should throw AuthenticationError if X-API-Key header is missing', async () => {
    await authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    expect(next.mock.calls[0][0].message).toContain('API key is required');
  });

  it('should throw AuthenticationError if API key format is invalid', async () => {
    req.headers['x-api-key'] = 'invalid-key-format';

    await authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    expect(next.mock.calls[0][0].message).toContain('Invalid API key format');
  });

  it('should throw AuthenticationError if no candidate key matches', async () => {
    const { rawKey, keyPrefix } = generateApiKey();
    req.headers['x-api-key'] = rawKey;
    apiKeyRepository.findByPrefix.mockResolvedValue([]);

    await authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    expect(next.mock.calls[0][0].message).toContain('Invalid API key');
  });

  it('should throw AuthenticationError if key is revoked', async () => {
    const { rawKey, keyPrefix } = generateApiKey();
    req.headers['x-api-key'] = rawKey;
    const keyHash = hashApiKey(rawKey);

    apiKeyRepository.findByPrefix.mockResolvedValue([
      {
        id: 'key-123',
        keyPrefix,
        keyHash,
        revokedAt: new Date(),
        expiresAt: null,
        project: { id: 'proj-1', organizationId: 'org-1', name: 'P1', slug: 'p1' },
      },
    ]);

    await authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    expect(next.mock.calls[0][0].message).toContain('revoked');
  });

  it('should throw AuthenticationError if key is expired', async () => {
    const { rawKey, keyPrefix } = generateApiKey();
    req.headers['x-api-key'] = rawKey;
    const keyHash = hashApiKey(rawKey);

    const pastDate = new Date(Date.now() - 10000);
    apiKeyRepository.findByPrefix.mockResolvedValue([
      {
        id: 'key-123',
        keyPrefix,
        keyHash,
        revokedAt: null,
        expiresAt: pastDate,
        project: { id: 'proj-1', organizationId: 'org-1', name: 'P1', slug: 'p1' },
      },
    ]);

    await authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    expect(next.mock.calls[0][0].message).toContain('expired');
  });

  it('should attach req.apiKey and req.project and call next() on valid API key', async () => {
    const { rawKey, keyPrefix } = generateApiKey();
    req.headers['x-api-key'] = rawKey;
    const keyHash = hashApiKey(rawKey);

    apiKeyRepository.findByPrefix.mockResolvedValue([
      {
        id: 'key-123',
        projectId: 'proj-1',
        name: 'Test Key',
        keyPrefix,
        keyHash,
        revokedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        project: { id: 'proj-1', organizationId: 'org-1', name: 'P1', slug: 'p1' },
      },
    ]);
    apiKeyRepository.updateLastUsedAt.mockResolvedValue({});

    await authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.apiKey).toBeDefined();
    expect(req.apiKey.id).toBe('key-123');
    expect(req.apiKey.keyHash).toBeUndefined(); // Verify hash is NOT attached
    expect(req.project).toBeDefined();
    expect(req.project.id).toBe('proj-1');
  });
});
