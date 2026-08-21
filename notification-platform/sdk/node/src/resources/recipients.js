class RecipientsResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Create a new recipient profile.
   *
   * @param {Object} input
   * @param {string} input.externalUserId
   * @param {string} [input.email]
   * @param {string} [input.phone]
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async create({ externalUserId, email, phone }, options = {}) {
    return this.http.request('POST', '/recipients', { externalUserId, email, phone }, options);
  }

  /**
   * Get recipient details by externalUserId.
   *
   * @param {string} externalUserId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async get(externalUserId, options = {}) {
    return this.http.request('GET', `/recipients/${externalUserId}`, null, options);
  }

  /**
   * Update recipient profile contact details.
   *
   * @param {string} externalUserId
   * @param {Object} input ({ email, phone })
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async update(externalUserId, { email, phone }, options = {}) {
    return this.http.request('PUT', `/recipients/${externalUserId}`, { email, phone }, options);
  }

  /**
   * List recipients with pagination.
   *
   * @param {Object} [params] ({ page, limit })
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async list(params = {}, options = {}) {
    const query = new URLSearchParams(params).toString();
    const path = `/recipients${query ? `?${query}` : ''}`;
    return this.http.request('GET', path, null, options);
  }
}

module.exports = RecipientsResource;
