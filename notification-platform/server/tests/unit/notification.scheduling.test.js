const notificationService = require('../../src/modules/notifications/notification.service');
const ValidationError = require('../../src/shared/errors/validation-error');

describe('Notification Scheduling Unit Tests', () => {
  const projectId = 'proj-unit-sch-101';

  it('1. Throws ValidationError (SCHEDULED_TIME_IN_PAST) if scheduledAt is in the past', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();

    await expect(
      notificationService.sendNotification({
        projectId,
        templateName: 'order-confirmed',
        recipient: 'user@example.com',
        scheduledAt: pastDate,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('2. Throws ValidationError (SCHEDULED_TIME_TOO_FAR) if scheduledAt exceeds 365 days', async () => {
    const farFutureDate = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString();

    await expect(
      notificationService.sendNotification({
        projectId,
        templateName: 'order-confirmed',
        recipient: 'user@example.com',
        scheduledAt: farFutureDate,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('3. Throws ValidationError if scheduledAt format is invalid', async () => {
    await expect(
      notificationService.sendNotification({
        projectId,
        templateName: 'order-confirmed',
        recipient: 'user@example.com',
        scheduledAt: 'invalid-date-string',
      })
    ).rejects.toThrow(ValidationError);
  });
});
