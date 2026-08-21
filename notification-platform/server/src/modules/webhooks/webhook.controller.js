const webhookService = require('./webhook.service');
const organizationRepository = require('../organizations/organization.repository');
const projectRepository = require('../projects/project.repository');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');

class WebhookController {
  /**
   * Check project ownership membership helper.
   */
  async checkProjectAccess(projectId, userId) {
    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError('You are not a member of the organization that owns this project');
    }
    return project;
  }

  create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { url } = req.body;

    await this.checkProjectAccess(projectId, userId);

    const webhook = await webhookService.createWebhook({ projectId, url });
    return ApiResponse.success(res, 'Webhook created successfully', { webhook }, 201);
  });

  list = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;

    await this.checkProjectAccess(projectId, userId);

    const webhooks = await webhookService.listWebhooks({ projectId });
    return ApiResponse.success(res, 'Webhooks retrieved successfully', { webhooks }, 200);
  });

  get = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, webhookId } = req.params;

    await this.checkProjectAccess(projectId, userId);

    const webhook = await webhookService.getWebhook({ id: webhookId, projectId });
    return ApiResponse.success(res, 'Webhook retrieved successfully', { webhook }, 200);
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, webhookId } = req.params;
    const { url, active } = req.body;

    await this.checkProjectAccess(projectId, userId);

    const webhook = await webhookService.updateWebhook({ id: webhookId, projectId, url, active });
    return ApiResponse.success(res, 'Webhook updated successfully', { webhook }, 200);
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, webhookId } = req.params;

    await this.checkProjectAccess(projectId, userId);

    await webhookService.deleteWebhook({ id: webhookId, projectId });
    return ApiResponse.success(res, 'Webhook deleted successfully', null, 200);
  });

  listDeliveries = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, webhookId } = req.params;
    const { page, limit } = req.query;

    await this.checkProjectAccess(projectId, userId);

    const result = await webhookService.listWebhookDeliveries({ id: webhookId, projectId, page, limit });
    return ApiResponse.success(res, 'Webhook deliveries retrieved successfully', result, 200);
  });
}

module.exports = new WebhookController();
