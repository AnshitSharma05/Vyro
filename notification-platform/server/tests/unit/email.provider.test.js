const emailProvider = require('../../src/providers/email/email.provider');
const transporter = require('../../src/providers/email/nodemailer.client');

jest.mock('../../src/providers/email/nodemailer.client');

describe('Email Provider Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should format message and call transporter.sendMail', async () => {
    transporter.sendMail.mockResolvedValue({ messageId: '<test-message-id-123@example.com>' });

    const payload = {
      recipient: 'user@example.com',
      subject: 'Test Subject',
      body: 'Hello Test Body',
    };

    const result = await emailProvider.send(payload);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('<test-message-id-123@example.com>');
    expect(result.provider).toBe('EMAIL_NODEMAILER');
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test Subject',
        text: 'Hello Test Body',
        html: 'Hello Test Body',
      })
    );
  });

  it('should throw structured error when transporter.sendMail fails', async () => {
    transporter.sendMail.mockRejectedValue(new Error('SMTP Connection Refused'));

    const payload = {
      recipient: 'user@example.com',
      subject: 'Test Subject',
      body: 'Hello Test Body',
    };

    await expect(emailProvider.send(payload)).rejects.toThrow('Email delivery failed via EMAIL_NODEMAILER: SMTP Connection Refused');
  });
});
