const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const transporter = require('./nodemailer.client');

class EmailProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'EMAIL_NODEMAILER';
  }

  async send({ recipient, subject, body }) {
    const from = process.env.SMTP_FROM || 'Notification Platform <no-reply@notificationplatform.com>';

    try {
      const info = await transporter.sendMail({
        from,
        to: recipient,
        subject: subject || 'Notification',
        text: body,
        html: body,
      });

      return {
        success: true,
        messageId: info.messageId || `msg_${Date.now()}`,
        provider: this.name,
        rawResponse: info,
      };
    } catch (error) {
      throw new Error(`Email delivery failed via ${this.name}: ${error.message}`);
    }
  }
}

module.exports = new EmailProvider();
