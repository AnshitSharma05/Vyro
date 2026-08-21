const analyticsService = require('./analytics.service');
const organizationRepository = require('../organizations/organization.repository');
const projectRepository = require('../projects/project.repository');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');

class AnalyticsController {
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

  async checkOrganizationAccess(organizationId, userId) {
    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError('You are not a member of this organization');
    }
    return membership;
  }

  getOverview = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, range, startDate, endDate } = req.query;

    await this.checkProjectAccess(projectId, userId);

    const result = await analyticsService.getOverviewAnalytics({ projectId, range, startDate, endDate });
    return ApiResponse.success(res, 'Analytics overview retrieved successfully', result, 200);
  });

  getChannels = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, range, startDate, endDate } = req.query;

    await this.checkProjectAccess(projectId, userId);

    const result = await analyticsService.getChannelAnalytics({ projectId, range, startDate, endDate });
    return ApiResponse.success(res, 'Channel analytics retrieved successfully', result, 200);
  });

  getOrganization = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId, range, startDate, endDate } = req.query;

    await this.checkOrganizationAccess(organizationId, userId);

    const result = await analyticsService.getOrganizationAnalytics({ organizationId, range, startDate, endDate });
    return ApiResponse.success(res, 'Organization analytics retrieved successfully', result, 200);
  });
}

module.exports = new AnalyticsController();
