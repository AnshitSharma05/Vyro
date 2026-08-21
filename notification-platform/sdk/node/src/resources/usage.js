class UsageResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Get organization monthly usage & quota summary.
   *
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async summary(options = {}) {
    return this.http.request('GET', '/usage/summary', null, options);
  }
}

module.exports = UsageResource;
