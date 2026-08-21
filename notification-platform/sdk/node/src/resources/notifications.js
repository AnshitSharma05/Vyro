class NotificationsResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Send a notification asynchronously.
   *
   * @param {Object} input
   * @param {string} [input.channel] - Notification channel (EMAIL, SMS, WHATSAPP, PUSH)
   * @param {string} input.template - Template name
   * @param {string} [input.category] - Category (TRANSACTIONAL, SECURITY, MARKETING, SYSTEM)
   * @param {string|Object} input.recipient - Recipient string or object ({ externalUserId })
   * @param {Object} [input.data] - Template rendering variables
   * @param {string} [input.scheduledAt] - ISO-8601 future timestamp
   * @param {Object} [options] - Request options
   * @param {string} [options.idempotencyKey] - Idempotency key
   * @returns {Promise<Object>}
   */
  async send({ channel, template, category = 'TRANSACTIONAL', recipient, data = {}, scheduledAt = null }, options = {}) {
    return this.http.request('POST', '/notifications/send', {
      channel,
      template,
      category,
      recipient,
      data,
      scheduledAt,
    }, options);
  }

  /**
   * Get notification details by ID.
   *
   * @param {string} notificationId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async get(notificationId, options = {}) {
    return this.http.request('GET', `/notifications/${notificationId}`, null, options);
  }

  /**
   * List notifications with pagination & filtering.
   *
   * @param {Object} [params] - Query params ({ page, limit, status, channel, recipient })
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async list(params = {}, options = {}) {
    const query = new URLSearchParams(params).toString();
    const path = `/notifications${query ? `?${query}` : ''}`;
    return this.http.request('GET', path, null, options);
  }

  /**
   * Cancel a scheduled notification before execution.
   *
   * @param {string} notificationId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async cancel(notificationId, options = {}) {
    return this.http.request('POST', `/notifications/${notificationId}/cancel`, null, options);
  }
}

module.exports = NotificationsResource;
