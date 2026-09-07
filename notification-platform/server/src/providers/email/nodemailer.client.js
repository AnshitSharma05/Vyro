const nodemailer = require('nodemailer');
const config = require('../../config/env');

function createTransporter() {
  const host = config.SMTP_HOST;
  const port = config.SMTP_PORT;
  const user = config.SMTP_USER;
  const pass = config.SMTP_PASS || process.env.SMTP_PASSWORD;

  // Use live SMTP transport when host and credentials are configured
  if (host && user && pass) {
    return {
      mode: 'live-smtp',
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      }),
    };
  }

  // Fallback: captures email as JSON locally — does not deliver to real inboxes
  return {
    mode: 'jsonTransport-mock',
    transporter: nodemailer.createTransport({ jsonTransport: true }),
  };
}

const { mode: transportMode, transporter } = createTransporter();

if (transportMode === 'jsonTransport-mock') {
  const logger = require('../../shared/utils/logger');
  const hasUser = !!config.SMTP_USER;
  const passLen = (config.SMTP_PASS || '').length;
  logger.warn(
    { hasUser, passLen },
    'SMTP mock mode active — emails NOT sent to real inboxes. Save .env with SMTP_PASS (Ctrl+S), then restart server and worker.'
  );
}

module.exports = transporter;
module.exports.transportMode = transportMode;
