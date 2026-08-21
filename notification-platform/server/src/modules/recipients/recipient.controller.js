const recipientService = require('./recipient.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class RecipientController {
  create = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId, email, phone } = req.body;

    const recipient = await recipientService.createRecipient({
      projectId,
      externalUserId,
      email,
      phone,
    });

    return ApiResponse.success(res, 'Recipient created successfully', { recipient }, 201);
  });

  get = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId } = req.params;

    const recipient = await recipientService.getRecipient(projectId, externalUserId);
    return ApiResponse.success(res, 'Recipient retrieved successfully', { recipient }, 200);
  });

  update = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId } = req.params;
    const { email, phone } = req.body;

    const recipient = await recipientService.updateRecipient(projectId, externalUserId, { email, phone });
    return ApiResponse.success(res, 'Recipient updated successfully', { recipient }, 200);
  });

  list = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { page, limit } = req.query;

    const result = await recipientService.listRecipients(projectId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponse.success(res, 'Recipients retrieved successfully', result, 200);
  });
}

module.exports = new RecipientController();
