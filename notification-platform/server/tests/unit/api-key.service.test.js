const apiKeyService = require('../../src/modules/api-keys/api-key.service');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const AuthorizationError = require('../../src/shared/errors/authorization-error');
const NotFoundError = require('../../src/shared/errors/not-found-error');

jest.mock('../../src/modules/api-keys/api-key.repository');
jest.mock('../../src/modules/projects/project.repository');
jest.mock('../../src/modules/organizations/organization.repository');

describe('ApiKey Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockProject = {
    id: 'proj-123',
    organizationId: 'org-123',
    name: 'Test Project',
  };

  describe('createApiKey', () => {
    it('should create an API key when user is OWNER or ADMIN', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'OWNER' });
      apiKeyRepository.create.mockImplementation(async (data) => ({
        id: 'key-123',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await apiKeyService.createApiKey({
        projectId: 'proj-123',
        name: 'Production Key',
        userId: 'user-123',
      });

      expect(result).toBeDefined();
      expect(result.key).toMatch(/^np_live_/);
      expect(result.keyPrefix).toMatch(/^np_live_/);
      expect(apiKeyRepository.create).toHaveBeenCalled();
    });

    it('should throw AuthorizationError when user has MEMBER role', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });

      await expect(
        apiKeyService.createApiKey({
          projectId: 'proj-123',
          name: 'Production Key',
          userId: 'user-123',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      projectRepository.findProjectById.mockResolvedValue(null);

      await expect(
        apiKeyService.createApiKey({
          projectId: 'non-existent',
          name: 'Production Key',
          userId: 'user-123',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listApiKeys', () => {
    it('should list API keys for organization members', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });
      apiKeyRepository.findByProjectId.mockResolvedValue([
        { id: 'key-1', name: 'Key 1', keyPrefix: 'np_live_12345678' },
      ]);

      const keys = await apiKeyService.listApiKeys({
        projectId: 'proj-123',
        userId: 'user-123',
      });

      expect(keys.length).toBe(1);
      expect(keys[0].keyPrefix).toBe('np_live_12345678');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key when user is ADMIN', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'ADMIN' });
      apiKeyRepository.findByIdAndProjectId.mockResolvedValue({
        id: 'key-123',
        projectId: 'proj-123',
      });
      apiKeyRepository.revoke.mockResolvedValue({
        id: 'key-123',
        revokedAt: new Date(),
      });

      const result = await apiKeyService.revokeApiKey({
        projectId: 'proj-123',
        apiKeyId: 'key-123',
        userId: 'user-123',
      });

      expect(result.revokedAt).toBeDefined();
      expect(apiKeyRepository.revoke).toHaveBeenCalledWith('key-123');
    });

    it('should throw AuthorizationError when user is MEMBER during revocation', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });

      await expect(
        apiKeyService.revokeApiKey({
          projectId: 'proj-123',
          apiKeyId: 'key-123',
          userId: 'user-123',
        })
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
