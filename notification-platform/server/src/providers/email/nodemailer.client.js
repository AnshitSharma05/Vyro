const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  // Use live SMTP transport if host and user credentials are provided
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback to JSON transport in test/development environment when live SMTP credentials are omitted
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const transporter = createTransporter();

module.exports = transporter;
