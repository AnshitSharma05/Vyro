const apiKeyService = require('./api-key.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const { API_KEY_MESSAGES } = require('./api-key.constants');

class ApiKeyController {
  create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { name, expiresAt, scopes } = req.body;

    const apiKeyData = await apiKeyService.createApiKey({
      projectId,
      name,
      expiresAt,
      scopes,
      userId,
    });

    return ApiResponse.success(res, API_KEY_MESSAGES.CREATED, apiKeyData, 201);
  });

  list = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;

    const apiKeys = await apiKeyService.listApiKeys({
      projectId,
      userId,
    });

    return ApiResponse.success(res, 'API keys retrieved successfully', { apiKeys }, 200);
  });

  revoke = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { projectId, apiKeyId } = req.params;

    const apiKey = await apiKeyService.revokeApiKey({
      projectId,
      apiKeyId,
      userId,
    });

    return ApiResponse.success(res, API_KEY_MESSAGES.REVOKED, { apiKey }, 200);
  });
}

module.exports = new ApiKeyController();
