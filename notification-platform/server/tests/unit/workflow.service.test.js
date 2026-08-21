const workflowService = require('../../src/modules/workflows/workflow.service');
const workflowRepository = require('../../src/modules/workflows/workflow.repository');
const ConflictError = require('../../src/shared/errors/conflict-error');

describe('WorkflowService Unit Tests (PHASE 19)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Creates workflow successfully when name is unique in project', async () => {
    jest.spyOn(workflowRepository, 'findByNameAndProjectId').mockResolvedValue(null);
    jest.spyOn(workflowRepository, 'create').mockImplementation(async (data) => ({
      id: 'wf-101',
      ...data,
      actions: data.actions || [],
      createdAt: new Date(),
    }));

    const result = await workflowService.createWorkflow({
      projectId: 'proj-wf-1',
      name: 'Order Confirmation Flow',
      eventName: 'ORDER_CREATED',
      actions: [
        { channel: 'EMAIL', category: 'TRANSACTIONAL', templateName: 'order-confirmation', delaySeconds: 0 },
      ],
    });

    expect(result.id).toBe('wf-101');
    expect(result.name).toBe('Order Confirmation Flow');
  });

  it('2. Throws ConflictError when workflow name already exists in project', async () => {
    jest.spyOn(workflowRepository, 'findByNameAndProjectId').mockResolvedValue({ id: 'wf-existing', name: 'Order Confirmation Flow' });

    await expect(
      workflowService.createWorkflow({
        projectId: 'proj-wf-1',
        name: 'Order Confirmation Flow',
        eventName: 'ORDER_CREATED',
        actions: [],
      })
    ).rejects.toThrow(ConflictError);
  });
});
