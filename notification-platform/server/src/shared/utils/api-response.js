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

  static error(res, message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', details = null) {
    const payload = {
      success: false,
      error: {
        code: errorCode,
        message,
      },
    };
    if (details !== null && details !== undefined) {
      payload.error.details = details;
    }
    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
