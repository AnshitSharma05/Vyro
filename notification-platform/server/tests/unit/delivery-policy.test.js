const deliveryPolicyService = require('../../src/shared/notification/delivery-policy.service');
const { NOTIFICATION_CATEGORIES } = require('../../src/shared/notification/notification-categories');
const { SUPPRESSION_REASONS } = require('../../src/shared/notification/suppression-reasons');

describe('DeliveryPolicyService Unit Tests (PHASE 18)', () => {
  it('1. Allows SECURITY category notifications even if explicit preference is disabled', () => {
    const result = deliveryPolicyService.evaluateDelivery({
      category: NOTIFICATION_CATEGORIES.SECURITY,
      channel: 'EMAIL',
      recipientEmail: 'user@example.com',
      recipientPreferences: [{ category: NOTIFICATION_CATEGORIES.SECURITY, channel: 'EMAIL', enabled: false }],
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('2. Suppresses MARKETING notifications by default when no explicit opt-in exists', () => {
    const result = deliveryPolicyService.evaluateDelivery({
      category: NOTIFICATION_CATEGORIES.MARKETING,
      channel: 'EMAIL',
      recipientEmail: 'user@example.com',
      recipientPreferences: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(SUPPRESSION_REASONS.USER_PREFERENCE);
  });

  it('3. Allows TRANSACTIONAL notifications by default', () => {
    const result = deliveryPolicyService.evaluateDelivery({
      category: NOTIFICATION_CATEGORIES.TRANSACTIONAL,
      channel: 'EMAIL',
      recipientEmail: 'user@example.com',
      recipientPreferences: [],
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('4. Suppresses notification when recipient lacks contact details for requested channel', () => {
    const result = deliveryPolicyService.evaluateDelivery({
      category: NOTIFICATION_CATEGORIES.TRANSACTIONAL,
      channel: 'EMAIL',
      recipientEmail: null,
      recipientPreferences: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(SUPPRESSION_REASONS.NO_VALID_RECIPIENT);
  });

  it('5. Suppresses PUSH notification when recipient has zero active registered push devices', () => {
    const result = deliveryPolicyService.evaluateDelivery({
      category: NOTIFICATION_CATEGORIES.TRANSACTIONAL,
      channel: 'PUSH',
      activeDevicesCount: 0,
      recipientPreferences: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(SUPPRESSION_REASONS.NO_ACTIVE_DEVICE);
  });
});
