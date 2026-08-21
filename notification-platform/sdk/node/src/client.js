const HttpClient = require('./http');
const EventsResource = require('./resources/events');
const NotificationsResource = require('./resources/notifications');
const RecipientsResource = require('./resources/recipients');
const PreferencesResource = require('./resources/preferences');
const DevicesResource = require('./resources/devices');
const TemplatesResource = require('./resources/templates');
const WorkflowsResource = require('./resources/workflows');
const WebhooksResource = require('./resources/webhooks');
const UsageResource = require('./resources/usage');

class NotificationClient {
  /**
   * Initialize official Node.js SDK for Notification Platform.
   *
   * @param {Object} options
   * @param {string} options.apiKey - API Key (x-api-key)
   * @param {string} [options.baseURL='http://localhost:5000/api/v1'] - Target API Base URL
   * @param {number} [options.timeout=10000] - Request timeout in milliseconds
   * @param {number} [options.maxRetries=3] - Maximum retry attempts for transient errors
   * @param {boolean} [options.debug=false] - Enable debug logging (redacts API keys)
   */
  constructor(options = {}) {
    this.http = new HttpClient(options);

    this.events = new EventsResource(this.http);
    this.notifications = new NotificationsResource(this.http);
    this.recipients = new RecipientsResource(this.http);
    this.preferences = new PreferencesResource(this.http);
    this.devices = new DevicesResource(this.http);
    this.templates = new TemplatesResource(this.http);
    this.workflows = new WorkflowsResource(this.http);
    this.webhooks = new WebhooksResource(this.http);
    this.usage = new UsageResource(this.http);
  }
}

module.exports = NotificationClient;
