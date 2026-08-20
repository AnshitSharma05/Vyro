const templateService = require('./template.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const { TEMPLATE_MESSAGES } = require('./template.constants');

class TemplateController {
  create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { name, channel, subject, body } = req.body;

    const template = await templateService.createTemplate({
      projectId,
      name,
      channel,
      subject,
      body,
      userId,
    });

    return ApiResponse.success(res, TEMPLATE_MESSAGES.CREATED, { template }, 201);
  });

  list = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { page, limit, channel } = req.query;

    const result = await templateService.listTemplates({
      projectId,
      page,
      limit,
      channel,
      userId,
    });

    return ApiResponse.success(res, TEMPLATE_MESSAGES.LIST_RETRIEVED, result, 200);
  });

  get = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, templateId } = req.params;

    const template = await templateService.getTemplate({
      projectId,
      templateId,
      userId,
    });

    return ApiResponse.success(res, TEMPLATE_MESSAGES.RETRIEVED, { template }, 200);
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, templateId } = req.params;
    const updateData = req.body;

    const template = await templateService.updateTemplate({
      projectId,
      templateId,
      updateData,
      userId,
    });

    return ApiResponse.success(res, TEMPLATE_MESSAGES.UPDATED, { template }, 200);
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, templateId } = req.params;

    await templateService.deleteTemplate({
      projectId,
      templateId,
      userId,
    });

    return ApiResponse.success(res, TEMPLATE_MESSAGES.DELETED, null, 200);
  });

  preview = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { templateId, subject, body, data } = req.body;

    const previewResult = await templateService.previewTemplate({
      projectId,
      templateId,
      subject,
      body,
      data,
      userId,
    });

    return ApiResponse.success(res, TEMPLATE_MESSAGES.PREVIEW_SUCCESS, previewResult, 200);
  });
}

module.exports = new TemplateController();
