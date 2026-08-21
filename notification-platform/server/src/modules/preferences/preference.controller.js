const preferenceService = require('./preference.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class PreferenceController {
  get = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId } = req.params;

    const data = await preferenceService.getPreferences(projectId, externalUserId);
    return ApiResponse.success(res, 'Preferences retrieved successfully', data, 200);
  });

  update = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId } = req.params;
    const { preferences } = req.body;

    const data = await preferenceService.updatePreferences(projectId, externalUserId, preferences);
    return ApiResponse.success(res, 'Preferences updated successfully', data, 200);
  });
}

module.exports = new PreferenceController();
