const templateService = require('../../src/modules/templates/template.service');
const templateRepository = require('../../src/modules/templates/template.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const AuthorizationError = require('../../src/shared/errors/authorization-error');
const NotFoundError = require('../../src/shared/errors/not-found-error');
const ConflictError = require('../../src/shared/errors/conflict-error');
const ValidationError = require('../../src/shared/errors/validation-error');

jest.mock('../../src/modules/templates/template.repository');
jest.mock('../../src/modules/projects/project.repository');
jest.mock('../../src/modules/organizations/organization.repository');

describe('Template Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockProject = {
    id: 'proj-123',
    organizationId: 'org-123',
    name: 'Test Project',
  };

  describe('createTemplate', () => {
    it('should create an EMAIL template when user is OWNER/ADMIN', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'OWNER' });
      templateRepository.findByNameAndProjectId.mockResolvedValue(null);
      templateRepository.create.mockImplementation(async (data) => ({
        id: 'tpl-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await templateService.createTemplate({
        projectId: 'proj-123',
        name: 'order-confirmed',
        channel: 'EMAIL',
        subject: 'Order {{orderId}} confirmed',
        body: 'Hello {{name}}, your order {{orderId}} is confirmed.',
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('order-confirmed');
      expect(result.variables).toEqual(['orderId', 'name']);
    });

    it('should throw AuthorizationError when user is MEMBER during creation', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });

      await expect(
        templateService.createTemplate({
          projectId: 'proj-123',
          name: 'order-confirmed',
          channel: 'EMAIL',
          subject: 'Order confirmed',
          body: 'Hello',
          userId: 'user-member',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw ConflictError on duplicate template name in same project', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'ADMIN' });
      templateRepository.findByNameAndProjectId.mockResolvedValue({ id: 'existing-tpl' });

      await expect(
        templateService.createTemplate({
          projectId: 'proj-123',
          name: 'order-confirmed',
          channel: 'EMAIL',
          subject: 'Order confirmed',
          body: 'Hello',
          userId: 'user-admin',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError if EMAIL template is missing subject', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'ADMIN' });
      templateRepository.findByNameAndProjectId.mockResolvedValue(null);

      await expect(
        templateService.createTemplate({
          projectId: 'proj-123',
          name: 'order-confirmed',
          channel: 'EMAIL',
          subject: '',
          body: 'Hello',
          userId: 'user-admin',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if non-EMAIL channel includes subject', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'ADMIN' });
      templateRepository.findByNameAndProjectId.mockResolvedValue(null);

      await expect(
        templateService.createTemplate({
          projectId: 'proj-123',
          name: 'sms-alert',
          channel: 'SMS',
          subject: 'SMS Subject Not Allowed',
          body: 'Hello {{name}}',
          userId: 'user-admin',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('previewTemplate', () => {
    it('should preview rendering of a draft template content', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });

      const preview = await templateService.previewTemplate({
        projectId: 'proj-123',
        subject: 'Welcome {{name}}',
        body: 'Hello {{name}}, your OTP is {{otp}}',
        data: { name: 'Anshit', otp: '4321' },
        userId: 'user-1',
      });

      expect(preview.subject).toBe('Welcome Anshit');
      expect(preview.body).toBe('Hello Anshit, your OTP is 4321');
    });

    it('should preview saved template by templateId', async () => {
      projectRepository.findProjectById.mockResolvedValue(mockProject);
      organizationRepository.findMembership.mockResolvedValue({ role: 'MEMBER' });
      templateRepository.findByIdAndProjectId.mockResolvedValue({
        id: 'tpl-1',
        subject: 'Order {{orderId}}',
        body: 'Hello {{name}}',
      });

      const preview = await templateService.previewTemplate({
        projectId: 'proj-123',
        templateId: 'tpl-1',
        data: { name: 'Anshit', orderId: 'ORD-100' },
        userId: 'user-1',
      });

      expect(preview.subject).toBe('Order ORD-100');
      expect(preview.body).toBe('Hello Anshit');
    });
  });
});
