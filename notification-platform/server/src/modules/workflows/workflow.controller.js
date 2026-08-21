const workflowService = require('./workflow.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class WorkflowController {
  create = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { name, description, eventName, status, actions } = req.body;

    const workflow = await workflowService.createWorkflow({
      projectId,
      name,
      description,
      eventName,
      status,
      actions,
    });

    return ApiResponse.success(res, 'Workflow created successfully', { workflow }, 201);
  });

  get = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { workflowId } = req.params;

    const workflow = await workflowService.getWorkflow(projectId, workflowId);
    return ApiResponse.success(res, 'Workflow retrieved successfully', { workflow }, 200);
  });

  update = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { workflowId } = req.params;

    const workflow = await workflowService.updateWorkflow(projectId, workflowId, req.body);
    return ApiResponse.success(res, 'Workflow updated successfully', { workflow }, 200);
  });

  delete = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { workflowId } = req.params;

    await workflowService.deleteWorkflow(projectId, workflowId);
    return ApiResponse.success(res, 'Workflow deleted successfully', null, 200);
  });

  list = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { page, limit } = req.query;

    const result = await workflowService.listWorkflows(projectId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponse.success(res, 'Workflows retrieved successfully', result, 200);
  });
}

module.exports = new WorkflowController();
