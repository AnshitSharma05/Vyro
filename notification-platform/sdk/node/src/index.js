const NotificationClient = require('./client');
const constants = require('./constants');
const errors = require('./errors');

module.exports = NotificationClient;
module.exports.NotificationClient = NotificationClient;
module.exports.default = NotificationClient;

module.exports.CHANNELS = constants.CHANNELS;
module.exports.CATEGORIES = constants.CATEGORIES;
module.exports.DEVICE_PLATFORMS = constants.DEVICE_PLATFORMS;
module.exports.WORKFLOW_STATUSES = constants.WORKFLOW_STATUSES;

module.exports.NotificationPlatformError = errors.NotificationPlatformError;
module.exports.ValidationError = errors.ValidationError;
module.exports.AuthenticationError = errors.AuthenticationError;
module.exports.AuthorizationError = errors.AuthorizationError;
module.exports.NotFoundError = errors.NotFoundError;
module.exports.ConflictError = errors.ConflictError;
module.exports.RateLimitError = errors.RateLimitError;
module.exports.ServerError = errors.ServerError;
module.exports.TimeoutError = errors.TimeoutError;
module.exports.NetworkError = errors.NetworkError;
