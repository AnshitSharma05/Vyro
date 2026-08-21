const notificationService = require('./notification.service');
const organizationRepository = require('../organizations/organization.repository');
const projectRepository = require('../projects/project.repository');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');
const { NOTIFICATION_MESSAGES } = require('./notification.constants');

class NotificationController {
  /**
   * Machine API Key Handler: POST /api/v1/notifications/send
   */
  send = asyncHandler(async (req, res) => {
    // req.project is attached by api-key.middleware.js
    const projectId = req.project.id;
    const { channel, template, recipient, data, scheduledAt } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

    const result = await notificationService.sendNotification({
      projectId,
      channel,
      templateName: template,
      recipient,
      data,
      idempotencyKey,
      scheduledAt,
    });

    const statusCode = result.status === 'SENT' ? 200 : 202;
    return ApiResponse.success(res, NOTIFICATION_MESSAGES.ACCEPTED, result, statusCode);
  });

  /**
   * Machine API Key Handler: POST /api/v1/notifications/:notificationId/cancel
   */
  cancelMachine = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { notificationId } = req.params;

    const result = await notificationService.cancelNotification({
      projectId,
      notificationId,
    });

    return ApiResponse.success(res, 'Scheduled notification cancelled successfully', result, 200);
  });

  /**
   * Machine API Key Handler: GET /api/v1/notifications
   */
  listMachine = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { page, limit, status, channel, recipient } = req.query;

    const result = await notificationService.listNotifications({
      projectId,
      page,
      limit,
      status,
      channel,
      recipient,
    });

    return ApiResponse.success(res, NOTIFICATION_MESSAGES.LIST_RETRIEVED, result, 200);
  });

  /**
   * Machine API Key Handler: GET /api/v1/notifications/:notificationId
   */
  getMachine = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { notificationId } = req.params;

    const notification = await notificationService.getNotification({
      projectId,
      notificationId,
    });

    return ApiResponse.success(res, NOTIFICATION_MESSAGES.RETRIEVED, { notification }, 200);
  });

  /**
   * Human JWT Dashboard Handler: GET /api/v1/projects/:projectId/notifications
   */
  listDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { page, limit, status, channel, recipient } = req.query;

    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(NOTIFICATION_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(NOTIFICATION_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    const result = await notificationService.listNotifications({
      projectId,
      page,
      limit,
      status,
      channel,
      recipient,
    });

    return ApiResponse.success(res, NOTIFICATION_MESSAGES.LIST_RETRIEVED, result, 200);
  });

  /**
   * Human JWT Dashboard Handler: GET /api/v1/projects/:projectId/notifications/:notificationId
   */
  getDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, notificationId } = req.params;

    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(NOTIFICATION_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(NOTIFICATION_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    const notification = await notificationService.getNotification({
      projectId,
      notificationId,
    });

    return ApiResponse.success(res, NOTIFICATION_MESSAGES.RETRIEVED, { notification }, 200);
  });

  /**
   * Human JWT Dashboard Handler: POST /api/v1/projects/:projectId/notifications/:notificationId/cancel
   */
  cancelDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, notificationId } = req.params;

    const project = await projectRepository.findProjectById(projectId);
    if (!project) {
      throw new NotFoundError(NOTIFICATION_MESSAGES.PROJECT_NOT_FOUND);
    }

    const membership = await organizationRepository.findMembership(project.organizationId, userId);
    if (!membership) {
      throw new AuthorizationError(NOTIFICATION_MESSAGES.ORGANIZATION_FORBIDDEN);
    }

    const result = await notificationService.cancelNotification({
      projectId,
      notificationId,
    });

    return ApiResponse.success(res, 'Scheduled notification cancelled successfully', result, 200);
  });
}

module.exports = new NotificationController();
