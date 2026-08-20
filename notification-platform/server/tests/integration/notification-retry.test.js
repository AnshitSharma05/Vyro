const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const providerFactory = require('../../src/providers/provider.factory');
const notificationQueue = require('../../src/queues/notification.queue');
const { processNotificationJob } = require('../../src/workers/notification.worker');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');
const { UnrecoverableError } = require('bullmq');

describe('NOTIFICATION RETRY LOGIC INTEGRATION TESTS (PHASE 9)', () => {
  const userA = {
    id: 'a1000000-0000-0000-0000-000000000001',
    email: 'user_retry_integ@example.com',
    name: 'User Retry Integ',
  };

  const orgA = {
    id: 'a2000000-0000-0000-0000-000000000001',
    name: 'Organization Retry Integ',
    slug: 'org-retry-integ',
  };

  const projectA = {
    id: 'a3000000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project Retry Integ',
    slug: 'proj-retry-integ',
    organization: orgA,
  };

  const { rawKey: rawApiKeyA, keyPrefix: prefixA } = generateApiKey();
  const hashA = hashApiKey(rawApiKeyA);

  const apiKeyRecordA = {
    id: 'key-retry-integ-a',
    projectId: projectA.id,
    name: 'Key Retry Integ A',
    keyPrefix: prefixA,
    keyHash: hashA,
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const templateA = {
    id: 'tpl-retry-integ-a',
    projectId: projectA.id,
    name: 'payment-receipt',
    channel: 'EMAIL',
    subject: 'Receipt for {{receiptId}}',
    body: 'Hello {{name}}, receipt {{receiptId}}.',
  };

  const inMemoryNotifications = [];
  const inMemoryAttempts = [];
  const inMemoryJobs = [];

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockResolvedValue(userA);
    jest.spyOn(organizationRepository, 'findMembership').mockResolvedValue({ role: 'OWNER' });
    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === prefixA) return [apiKeyRecordA];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      if (name === 'payment-receipt' && projId === projectA.id) return templateA;
      return null;
    });

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `notif-r-${inMemoryNotifications.length + 1}`,
        projectId: data.projectId,
        templateId: data.templateId,
        channel: data.channel,
        recipient: data.recipient,
        status: data.status,
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        failedAt: null,
        attempts: [],
      };
      inMemoryNotifications.push(record);
      return record;
    });

    jest.spyOn(notificationRepository, 'createAttempt').mockImplementation(async (data) => {
      const attempt = {
        id: `att-r-${inMemoryAttempts.length + 1}`,
        notificationId: data.notificationId,
        provider: data.provider,
        status: data.status,
        attemptNumber: data.attemptNumber || 1,
        errorCode: data.errorCode || null,
        errorMessage: data.errorMessage || null,
        attemptedAt: new Date(),
        deliveredAt: data.deliveredAt || null,
      };
      inMemoryAttempts.push(attempt);
      const notif = inMemoryNotifications.find((n) => n.id === data.notificationId);
      if (notif) notif.attempts.push(attempt);
      return attempt;
    });

    jest.spyOn(notificationRepository, 'getAttemptCount').mockImplementation(async (notificationId) => {
      return inMemoryAttempts.filter((a) => a.notificationId === notificationId).length;
    });

    jest.spyOn(notificationRepository, 'updateStatus').mockImplementation(async (id, updateData) => {
      const notif = inMemoryNotifications.find((n) => n.id === id);
      if (notif) {
        notif.status = updateData.status;
        if (updateData.sentAt) notif.sentAt = updateData.sentAt;
        if (updateData.failedAt) notif.failedAt = updateData.failedAt;
      }
      return notif;
    });

    jest.spyOn(notificationRepository, 'findByIdAndProjectId').mockImplementation(async (id, projId) => {
      return inMemoryNotifications.find((n) => n.id === id && n.projectId === projId) || null;
    });

    jest.spyOn(notificationQueue, 'addNotificationJob').mockImplementation(async ({ notificationId }) => {
      const job = { id: `job-r-${inMemoryJobs.length + 1}`, data: { notificationId } };
      inMemoryJobs.push(job);
      return job;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Retryable Failure (Attempt #1) updates status to RETRYING, and Attempt #2 succeeds with SENT status', async () => {
    // API Call to trigger notification
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA)
      .send({
        template: 'payment-receipt',
        recipient: 'retry_test@example.com',
        data: { name: 'Anshit', receiptId: 'RCP-101' },
      });

    expect(res.statusCode).toBe(202);
    const notifId = res.body.data.id;

    // Mock Provider: First call fails with ETIMEDOUT (retryable), second call succeeds
    const mockEmailProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('SMTP Network Timeout'), { code: 'ETIMEDOUT' }))
        .mockResolvedValueOnce({ success: true, messageId: 'msg-retry-ok', provider: 'EMAIL_NODEMAILER' }),
    };
    jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockEmailProvider);

    const job = { id: 'job-r-1', data: { notificationId: notifId } };

    // --- Attempt #1 (Transient Failure) ---
    await expect(processNotificationJob(job)).rejects.toThrow('SMTP Network Timeout');

    let notifState = inMemoryNotifications.find((n) => n.id === notifId);
    expect(notifState.status).toBe('RETRYING');

    // --- Attempt #2 (Successful Retry) ---
    await processNotificationJob(job);

    notifState = inMemoryNotifications.find((n) => n.id === notifId);
    expect(notifState.status).toBe('SENT');
    expect(notifState.attempts).toHaveLength(2);
    expect(notifState.attempts[0].attemptNumber).toBe(1);
    expect(notifState.attempts[0].status).toBe('FAILED');
    expect(notifState.attempts[1].attemptNumber).toBe(2);
    expect(notifState.attempts[1].status).toBe('SUCCESS');
  });

  it('2. Non-Retryable Failure immediately sets status to FAILED and throws UnrecoverableError', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA)
      .send({
        template: 'payment-receipt',
        recipient: 'non_retryable@example.com',
        data: { name: 'Anshit', receiptId: 'RCP-102' },
      });

    const notifId = res.body.data.id;

    const mockNonRetryableProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockRejectedValue(Object.assign(new Error('Invalid Recipient Address'), { code: 'INVALID_RECIPIENT' })),
    };
    jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockNonRetryableProvider);

    const job = { id: 'job-r-2', data: { notificationId: notifId } };

    await expect(processNotificationJob(job)).rejects.toThrow(UnrecoverableError);

    const notifState = inMemoryNotifications.find((n) => n.id === notifId);
    expect(notifState.status).toBe('FAILED');
    expect(notifState.attempts).toHaveLength(1);
  });
});
