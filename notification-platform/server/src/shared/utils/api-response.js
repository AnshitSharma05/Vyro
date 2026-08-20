class ApiResponse {
  static success(res, message, data = null, statusCode = 200) {
    const payload = {
      success: true,
      message,
    };
    if (data !== null && data !== undefined) {
      payload.data = data;
    }
    return res.status(statusCode).json(payload);
  }

  static error(res, message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', errors = null) {
    const payload = {
      success: false,
      message,
      errorCode,
    };
    if (errors !== null && errors !== undefined) {
      payload.errors = errors;
    }
    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
