const { v4: uuidv4 } = require('uuid');

const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Express middleware to sanitize or generate an X-Request-ID header.
 */
function requestIdMiddleware(req, res, next) {
  let requestId = req.headers['x-request-id'] || req.headers['request-id'];

  if (typeof requestId === 'string' && REQUEST_ID_REGEX.test(requestId.trim())) {
    requestId = requestId.trim();
  } else {
    requestId = `req_${uuidv4()}`;
  }

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = requestIdMiddleware;
