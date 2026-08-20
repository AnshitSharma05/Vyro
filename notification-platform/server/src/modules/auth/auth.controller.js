const authService = require('./auth.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');
const { AUTH_MESSAGES } = require('./auth.constants');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    const result = await authService.register({ email, password, name });
    return ApiResponse.success(res, AUTH_MESSAGES.REGISTER_SUCCESS, result, 201);
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return ApiResponse.success(res, AUTH_MESSAGES.LOGIN_SUCCESS, result, 200);
  });

  me = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await authService.getCurrentUser(userId);
    return ApiResponse.success(res, AUTH_MESSAGES.PROFILE_SUCCESS, { user }, 200);
  });

  logout = asyncHandler(async (req, res) => {
    return ApiResponse.success(res, AUTH_MESSAGES.LOGOUT_SUCCESS, null, 200);
  });
}

module.exports = new AuthController();
