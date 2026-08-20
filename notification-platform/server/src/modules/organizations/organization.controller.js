const organizationService = require('./organization.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const { ORGANIZATION_MESSAGES } = require('./organization.constants');

class OrganizationController {
  create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name } = req.body;

    const organization = await organizationService.createOrganization({ name, userId });
    return ApiResponse.success(res, ORGANIZATION_MESSAGES.CREATE_SUCCESS, organization, 201);
  });

  list = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const organizations = await organizationService.getUserOrganizations(userId);
    return ApiResponse.success(res, ORGANIZATION_MESSAGES.LIST_SUCCESS, { organizations }, 200);
  });

  get = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req.params;

    const organization = await organizationService.getOrganization(organizationId, userId);
    return ApiResponse.success(res, ORGANIZATION_MESSAGES.GET_SUCCESS, { organization }, 200);
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req.params;
    const updateData = req.body;

    const organization = await organizationService.updateOrganization(organizationId, userId, updateData);
    return ApiResponse.success(res, ORGANIZATION_MESSAGES.UPDATE_SUCCESS, { organization }, 200);
  });

  listMembers = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req.params;

    const members = await organizationService.getOrganizationMembers(organizationId, userId);
    return ApiResponse.success(res, ORGANIZATION_MESSAGES.MEMBERS_LIST_SUCCESS, { members }, 200);
  });
}

module.exports = new OrganizationController();
