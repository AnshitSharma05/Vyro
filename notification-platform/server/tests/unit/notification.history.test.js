const notificationRepository = require('../../src/modules/notifications/notification.repository');
const prisma = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  notificationAttempt: {
    create: jest.fn(),
  },
}));

describe('Notification History Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeErrorMessage', () => {
    it('should return null for null or non-string inputs', () => {
      expect(notificationRepository.sanitizeErrorMessage(null)).toBeNull();
      expect(notificationRepository.sanitizeErrorMessage(undefined)).toBeNull();
      expect(notificationRepository.sanitizeErrorMessage(123)).toBeNull();
    });

    it('should return untouched string if under 500 characters', () => {
      const shortErr = 'SMTP connection timeout';
      expect(notificationRepository.sanitizeErrorMessage(shortErr)).toBe('SMTP connection timeout');
    });

    it('should truncate error strings longer than 500 characters and append ellipsis', () => {
      const longErr = 'A'.repeat(600);
      const sanitized = notificationRepository.sanitizeErrorMessage(longErr);
      expect(sanitized.length).toBe(500);
      expect(sanitized.endsWith('...')).toBe(true);
    });
  });

  describe('findManyByProjectId pagination & filters', () => {
    it('should cap page limit at 100 and enforce minimum page 1', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await notificationRepository.findManyByProjectId({
        projectId: 'proj-123',
        page: -5,
        limit: 999,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 100,
        })
      );
    });

    it('should construct correct Prisma query filters for status, channel, recipient', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await notificationRepository.findManyByProjectId({
        projectId: 'proj-123',
        page: 1,
        limit: 20,
        status: 'SENT',
        channel: 'EMAIL',
        recipient: 'anshit',
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: 'proj-123',
            status: 'SENT',
            channel: 'EMAIL',
            recipient: { contains: 'anshit', mode: 'insensitive' },
          },
        })
      );
    });
  });
});
