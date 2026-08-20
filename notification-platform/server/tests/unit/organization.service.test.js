const organizationService = require('../../src/modules/organizations/organization.service');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const AuthorizationError = require('../../src/shared/errors/authorization-error');
const NotFoundError = require('../../src/shared/errors/not-found-error');

jest.mock('../../src/modules/organizations/organization.repository');

describe('OrganizationService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create an organization with generated unique slug and owner membership', async () => {
      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.createWithMember.mockResolvedValue({
        id: 'org-uuid-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        membership: { role: 'OWNER' },
      });

      const result = await organizationService.createOrganization({
        name: 'Acme Corp',
        userId: 'usr-uuid-1',
      });

      expect(result.id).toBe('org-uuid-1');
      expect(result.slug).toBe('acme-corp');
      expect(organizationRepository.createWithMember).toHaveBeenCalledWith({
        name: 'Acme Corp',
        slug: 'acme-corp',
        userId: 'usr-uuid-1',
      });
    });

    it('should append numeric counter if slug collision occurs', async () => {
      organizationRepository.findBySlug
        .mockResolvedValueOnce({ id: 'existing-org' })
        .mockResolvedValueOnce(null);

      organizationRepository.createWithMember.mockResolvedValue({
        id: 'org-uuid-2',
        name: 'Acme Corp',
        slug: 'acme-corp-2',
      });

      const result = await organizationService.createOrganization({
        name: 'Acme Corp',
        userId: 'usr-uuid-1',
      });

      expect(result.slug).toBe('acme-corp-2');
    });
  });

  describe('getOrganization', () => {
    it('should return organization details for authorized member', async () => {
      organizationRepository.findMembership.mockResolvedValue({ role: 'OWNER' });
      organizationRepository.findById.mockResolvedValue({
        id: 'org-uuid-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
      });

      const result = await organizationService.getOrganization('org-uuid-1', 'usr-uuid-1');
      expect(result.name).toBe('Acme Corp');
      expect(result.userRole).toBe('OWNER');
    });

    it('should throw AuthorizationError if user is not a member of organization', async () => {
      organizationRepository.findMembership.mockResolvedValue(null);

      await expect(
        organizationService.getOrganization('org-uuid-1', 'unauthorized-user')
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('updateOrganization', () => {
    it('should allow OWNER to update organization name', async () => {
      organizationRepository.findMembership.mockResolvedValue({ role: 'OWNER' });
      organizationRepository.findById.mockResolvedValue({
        id: 'org-uuid-1',
        name: 'Old Name',
      });
      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.update.mockResolvedValue({
        id: 'org-uuid-1',
        name: 'New Name',
        slug: 'new-name',
      });

      const result = await organizationService.updateOrganization('org-uuid-1', 'usr-uuid-1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
    });

    it('should throw AuthorizationError if MEMBER role attempts to update organization', async () => {
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });

      await expect(
        organizationService.updateOrganization('org-uuid-1', 'usr-member', { name: 'Unauthorized' })
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
