const NotificationClient = require('../src/client');
const { ValidationError } = require('../src/errors');

describe('NotificationClient SDK Unit Tests (PHASE 20)', () => {
  it('1. Throws ValidationError when initialized without API key', () => {
    expect(() => new NotificationClient({})).toThrow(ValidationError);
    expect(() => new NotificationClient({ apiKey: '  ' })).toThrow(ValidationError);
  });

  it('2. Initializes successfully with API key and sets up resource namespaces', () => {
    const client = new NotificationClient({ apiKey: 'test_api_key_xyz123' });

    expect(client.events).toBeDefined();
    expect(client.notifications).toBeDefined();
    expect(client.recipients).toBeDefined();
    expect(client.preferences).toBeDefined();
    expect(client.devices).toBeDefined();
    expect(client.templates).toBeDefined();
    expect(client.workflows).toBeDefined();
    expect(client.webhooks).toBeDefined();
  });
});
