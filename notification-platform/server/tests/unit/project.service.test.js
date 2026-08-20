const projectService = require('../../src/modules/projects/project.service');
const projectRepository = require('../../src/modules/projects/project.repository');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const AuthorizationError = require('../../src/shared/errors/authorization-error');
const NotFoundError = require('../../src/shared/errors/not-found-error');

jest.mock('../../src/modules/projects/project.repository');
jest.mock('../../src/modules/organizations/organization.repository');

describe('ProjectService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should allow OWNER or ADMIN to create a project', async () => {
      organizationRepository.findMembership.mockResolvedValue({ role: 'ADMIN' });
      projectRepository.findByOrganizationIdAndSlug.mockResolvedValue(null);
      projectRepository.create.mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        name: 'E-Commerce',
        slug: 'e-commerce',
      });

      const result = await projectService.createProject({
        organizationId: 'org-1',
        name: 'E-Commerce',
        userId: 'usr-1',
      });

      expect(result.name).toBe('E-Commerce');
      expect(result.slug).toBe('e-commerce');
    });

    it('should throw AuthorizationError if user is not in organization', async () => {
      organizationRepository.findMembership.mockResolvedValue(null);

      await expect(
        projectService.createProject({
          organizationId: 'org-1',
          name: 'E-Commerce',
          userId: 'usr-outside',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError if MEMBER attempts to create project', async () => {
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });

      await expect(
        projectService.createProject({
          organizationId: 'org-1',
          name: 'E-Commerce',
          userId: 'usr-member',
        })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('getProject', () => {
    it('should return project if user is org member and project belongs to organization', async () => {
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });
      projectRepository.findProjectByIdAndOrganizationId.mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        name: 'My Project',
      });

      const result = await projectService.getProject({
        organizationId: 'org-1',
        projectId: 'proj-1',
        userId: 'usr-1',
      });

      expect(result.id).toBe('proj-1');
    });

    it('should throw NotFoundError if project belongs to another organization', async () => {
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });
      projectRepository.findProjectByIdAndOrganizationId.mockResolvedValue(null);

      await expect(
        projectService.getProject({
          organizationId: 'org-1',
          projectId: 'proj-belonging-to-org-2',
          userId: 'usr-1',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
