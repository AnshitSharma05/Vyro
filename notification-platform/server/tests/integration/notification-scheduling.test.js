const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const notificationQueue = require('../../src/queues/notification.queue');
const { processNotificationJob } = require('../../src/workers/notification.worker');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');
const prisma = require('../../src/config/database');

describe('NOTIFICATION SCHEDULING INTEGRATION TESTS (PHASE 14)', () => {
  const userA = {
    id: 'schu1000-0000-0000-0000-000000000001',
    email: 'user_sch@example.com',
    name: 'User SCH',
  };

  const orgA = {
    id: 'scho2000-0000-0000-0000-000000000001',
    name: 'Organization SCH',
    slug: 'org-sch',
  };

  const projectA = {
    id: 'schp3000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project SCH A',
    slug: 'proj-sch-a',
    organization: orgA,
  };

  const { rawKey: rawApiKey, keyPrefix } = generateApiKey();
  const apiKeyRecord = {
    id: 'key-sch-1',
    projectId: projectA.id,
    name: 'Key SCH 1',
    keyPrefix,
    keyHash: hashApiKey(rawApiKey),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const templateInvoice = {
    id: 'tpl-sch-inv',
    projectId: projectA.id,
    name: 'scheduled-reminder',
    channel: 'EMAIL',
    subject: 'Reminder for {{name}}',
    body: 'Your appointment is coming up',
  };

  const inMemoryNotifications = [];

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockResolvedValue(userA);
    jest.spyOn(organizationRepository, 'findMembership').mockResolvedValue({ role: 'OWNER' });
    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockResolvedValue([apiKeyRecord]);
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockResolvedValue(templateInvoice);

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `notif-sch-${inMemoryNotifications.length + 1}`,
        projectId: data.projectId,
        templateId: data.templateId,
        channel: data.channel,
        recipient: data.recipient,
        status: data.status,
        scheduledAt: data.scheduledAt || null,
        cancelledAt: null,
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryNotifications.push(record);
      return record;
    });

    jest.spyOn(notificationRepository, 'findByIdAndProjectId').mockImplementation(async (id, projId) => {
      return inMemoryNotifications.find((n) => n.id === id && n.projectId === projId) || null;
    });

    jest.spyOn(notificationRepository, 'cancelScheduledNotification').mockImplementation(async (id, projId) => {
      const notif = inMemoryNotifications.find((n) => n.id === id && n.projectId === projId);
      if (notif && notif.status === 'SCHEDULED') {
        notif.status = 'CANCELLED';
        notif.cancelledAt = new Date();
        return { count: 1 };
      }
      return { count: 0 };
    });

    jest.spyOn(notificationQueue, 'addNotificationJob').mockResolvedValue({ id: 'job-sch-1' });
    jest.spyOn(notificationQueue, 'removeNotificationJob').mockResolvedValue(true);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. POST /api/v1/notifications/send with future scheduledAt creates SCHEDULED notification and enqueues delayed job', async () => {
    const futureDate = new Date(Date.now() + 86400 * 1000).toISOString();

    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKey)
      .send({
        template: 'scheduled-reminder',
        recipient: 'sch_user@example.com',
        data: { name: 'Anshit' },
        scheduledAt: futureDate,
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.scheduledAt).toBeDefined();
    expect(notificationQueue.addNotificationJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ delay: expect.any(Number), jobId: expect.stringContaining('scheduled:') })
    );
  });

  it('2. POST /api/v1/notifications/:id/cancel cancels a SCHEDULED notification', async () => {
    const createdNotif = inMemoryNotifications[0];

    const res = await request(app)
      .post(`/api/v1/notifications/${createdNotif.id}/cancel`)
      .set('X-API-Key', rawApiKey);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(createdNotif.status).toBe('CANCELLED');
  });

  it('3. Cancelling an already CANCELLED notification returns HTTP 409 Conflict', async () => {
    const createdNotif = inMemoryNotifications[0];

    const res = await request(app)
      .post(`/api/v1/notifications/${createdNotif.id}/cancel`)
      .set('X-API-Key', rawApiKey);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('NOTIFICATION_ALREADY_CANCELLED');
  });
});
