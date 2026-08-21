const deviceService = require('./device.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class DeviceController {
  register = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId } = req.params;
    const { token, platform } = req.body;

    const device = await deviceService.registerDevice(projectId, externalUserId, { token, platform });
    return ApiResponse.success(res, 'Device registered successfully', { device }, 201);
  });

  list = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId } = req.params;

    const devices = await deviceService.listDevices(projectId, externalUserId);
    return ApiResponse.success(res, 'Devices retrieved successfully', { devices }, 200);
  });

  deactivate = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { externalUserId, deviceId } = req.params;

    const device = await deviceService.deactivateDevice(projectId, externalUserId, deviceId);
    return ApiResponse.success(res, 'Device deactivated successfully', { device }, 200);
  });
}

module.exports = new DeviceController();
