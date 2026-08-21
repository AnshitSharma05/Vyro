const ValidationError = require('../errors/validation-error');

const PRIVATE_IP_REGEX = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|::1|0:0:0:0:0:0:0:1)/;

/**
 * Validates outbound webhook URL to prevent SSRF vulnerabilities.
 *
 * @param {string} urlString
 * @returns {string} Normalized URL string
 */
function validateWebhookUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    throw new ValidationError('Webhook URL must be a valid non-empty string');
  }

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (err) {
    throw new ValidationError('Invalid Webhook URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('Webhook URL must use HTTP or HTTPS protocol');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Allow localhost for local development / automated tests if specified
  const allowLocal = process.env.NODE_ENV === 'test' || process.env.ALLOW_LOCAL_WEBHOOKS === 'true';

  if (!allowLocal) {
    if (hostname === 'localhost' || PRIVATE_IP_REGEX.test(hostname)) {
      throw new ValidationError('Webhook URL destination is a restricted private IP or loopback address');
    }
  }

  return parsed.toString();
}

module.exports = {
  validateWebhookUrl,
};
