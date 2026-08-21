const usageService = require('./usage.service');
const projectRepository = require('../projects/project.repository');
const organizationRepository = require('../organizations/organization.repository');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const AuthorizationError = require('../../shared/errors/authorization-error');
const NotFoundError = require('../../shared/errors/not-found-error');

class UsageController {
  getSummaryDashboard = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const userId = req.user.id;

    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError('You do not have access to this organization');
    }

    const summary = await usageService.getUsageSummary(organizationId);
    return ApiResponse.success(res, 'Usage summary retrieved successfully', summary, 200);
  });

  getSummaryMachine = asyncHandler(async (req, res) => {
    // req.project is attached by api-key.middleware.js
    const organizationId = req.project.organizationId;

    const summary = await usageService.getUsageSummary(organizationId);
    return ApiResponse.success(res, 'Usage summary retrieved successfully', summary, 200);
  });

  getHistoryDashboard = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const userId = req.user.id;

    const membership = await organizationRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AuthorizationError('You do not have access to this organization');
    }

    const history = await usageService.getUsageHistory(organizationId);
    return ApiResponse.success(res, 'Usage history retrieved successfully', { history }, 200);
  });
}

module.exports = new UsageController();
