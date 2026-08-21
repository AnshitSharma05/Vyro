const request = require('supertest');
const app = require('../../src/app');
const eventService = require('../../src/modules/events/event.service');
const eventRepository = require('../../src/modules/events/event.repository');
const workflowRepository = require('../../src/modules/workflows/workflow.repository');
const notificationService = require('../../src/modules/notifications/notification.service');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const eventQueue = require('../../src/queues/event.queue');
const { processEventJob } = require('../../src/workers/event.worker');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('NOTIFICATION WORKFLOWS & EVENT-DRIVEN AUTOMATION INTEGRATION TESTS (PHASE 19)', () => {
  const projectA = {
    id: 'proj_wf_1000-0000-0000-0000-000000000001',
    organizationId: 'org_wf_1',
    name: 'Project Workflows A',
    slug: 'proj-wf-a',
  };

  const { rawKey, keyPrefix } = generateApiKey();
  const apiKeyRecord = {
    id: 'key-wf-all',
    projectId: projectA.id,
    name: 'Workflow Key',
    keyPrefix,
    keyHash: hashApiKey(rawKey),
    scopes: ['events:write', 'events:read', 'workflows:read', 'workflows:write'],
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const mockEventLog = {
    id: 'evt_log_100',
    projectId: projectA.id,
    eventName: 'ORDER_CREATED',
    externalEventId: 'order_999_created',
    recipient: 'customer@example.com',
    payload: { orderId: 'ORD-999', amount: 4999 },
    status: 'PENDING',
  };

  const mockWorkflow = {
    id: 'wf_order_1',
    projectId: projectA.id,
    name: 'Order Confirmation Flow',
    eventName: 'ORDER_CREATED',
    status: 'ACTIVE',
    actions: [
      {
        id: 'wfa_action_1',
        workflowId: 'wf_order_1',
        order: 1,
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        templateName: 'order-confirmation',
        delaySeconds: 0,
      },
    ],
  };

  beforeAll(() => {
    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === keyPrefix) return [apiKeyRecord];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
    jest.spyOn(eventQueue, 'addEventJob').mockResolvedValue({ id: 'job-event-1' });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Ingests business event asynchronously via POST /api/v1/events and returns 202 Accepted', async () => {
    jest.spyOn(eventRepository, 'findByExternalEventId').mockResolvedValue(null);
    jest.spyOn(eventRepository, 'create').mockResolvedValue(mockEventLog);

    const res = await request(app)
      .post('/api/v1/events')
      .set('X-API-Key', rawKey)
      .send({
        event: 'ORDER_CREATED',
        externalEventId: 'order_999_created',
        recipient: 'customer@example.com',
        data: { orderId: 'ORD-999', amount: 4999 },
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.data.eventId).toBe('evt_log_100');
    expect(res.body.data.status).toBe('RECEIVED');
  });

  it('2. Replays existing event idempotently when duplicate externalEventId is submitted', async () => {
    jest.spyOn(eventRepository, 'findByExternalEventId').mockResolvedValue(mockEventLog);

    const res = await request(app)
      .post('/api/v1/events')
      .set('X-API-Key', rawKey)
      .send({
        event: 'ORDER_CREATED',
        externalEventId: 'order_999_created',
        recipient: 'customer@example.com',
        data: { orderId: 'ORD-999', amount: 4999 },
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.data.eventId).toBe('evt_log_100');
    expect(res.body.data.replayed).toBe(true);
  });

  it('3. Event Worker processEventJob matches active workflows and generates notification actions', async () => {
    jest.spyOn(eventRepository, 'findById').mockResolvedValue(mockEventLog);
    jest.spyOn(workflowRepository, 'findActiveByEventName').mockResolvedValue([mockWorkflow]);
    jest.spyOn(workflowRepository, 'createExecution').mockResolvedValue({ id: 'wf_exec_1' });
    jest.spyOn(workflowRepository, 'createActionExecution').mockResolvedValue({ id: 'wfa_exec_1' });
    jest.spyOn(workflowRepository, 'updateExecutionStatus').mockResolvedValue({});
    jest.spyOn(eventRepository, 'updateStatus').mockResolvedValue({});

    const sendNotifSpy = jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({
      id: 'notif_wf_gen_1',
      status: 'PENDING',
    });

    await processEventJob({ id: 'job-event-1', data: { eventId: mockEventLog.id } });

    expect(sendNotifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: projectA.id,
        channel: 'EMAIL',
        templateName: 'order-confirmation',
        category: 'TRANSACTIONAL',
        recipient: 'customer@example.com',
      })
    );
  });
});
