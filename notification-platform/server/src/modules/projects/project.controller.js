const projectService = require('./project.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const { PROJECT_MESSAGES } = require('./project.constants');

class ProjectController {
  create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req.params;
    const { name } = req.body;

    const project = await projectService.createProject({ organizationId, name, userId });
    return ApiResponse.success(res, PROJECT_MESSAGES.CREATE_SUCCESS, project, 201);
  });

  list = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req.params;

    const projects = await projectService.listProjects({ organizationId, userId });
    return ApiResponse.success(res, PROJECT_MESSAGES.LIST_SUCCESS, { projects }, 200);
  });

  get = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId, projectId } = req.params;

    const project = await projectService.getProject({ organizationId, projectId, userId });
    return ApiResponse.success(res, PROJECT_MESSAGES.GET_SUCCESS, { project }, 200);
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId, projectId } = req.params;
    const updateData = req.body;

    const project = await projectService.updateProject({ organizationId, projectId, userId, updateData });
    return ApiResponse.success(res, PROJECT_MESSAGES.UPDATE_SUCCESS, { project }, 200);
  });
}

module.exports = new ProjectController();
