class EventsResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Track a business event asynchronously.
   *
   * @param {Object} input
   * @param {string} input.event - Event name (e.g. ORDER_CREATED)
   * @param {string} input.externalEventId - Idempotent external event ID
   * @param {string|Object} input.recipient - Recipient string or object ({ externalUserId })
   * @param {Object} [input.data] - Event payload data
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async track({ event, externalEventId, recipient, data = {} }, options = {}) {
    return this.http.request('POST', '/events', {
      event,
      externalEventId,
      recipient,
      data,
    }, options);
  }

  /**
   * Get event ingestion history details by ID.
   *
   * @param {string} eventId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async get(eventId, options = {}) {
    return this.http.request('GET', `/events/${eventId}`, null, options);
  }

  /**
   * List ingested events.
   *
   * @param {Object} [params] - Query params ({ page, limit })
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async list(params = {}, options = {}) {
    const query = new URLSearchParams(params).toString();
    const path = `/events${query ? `?${query}` : ''}`;
    return this.http.request('GET', path, null, options);
  }
}

module.exports = EventsResource;
