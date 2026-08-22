const healthService = require('./health.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class HealthController {
  liveness = asyncHandler(async (req, res) => {
    const data = healthService.getLiveness();
    return ApiResponse.success(res, 'Liveness status OK', data, 200);
  });

  readiness = asyncHandler(async (req, res) => {
    const data = await healthService.getReadiness();
    const statusCode = data.healthy ? 200 : 503;
    return ApiResponse.success(res, `Readiness probe status: ${data.status.toUpperCase()}`, data, statusCode);
  });
}

module.exports = new HealthController();
