class PreferencesResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Get recipient preferences by externalUserId.
   *
   * @param {string} externalUserId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async get(externalUserId, options = {}) {
    return this.http.request('GET', `/recipients/${externalUserId}/preferences`, null, options);
  }

  /**
   * Update recipient notification category & channel preferences.
   *
   * @param {string} externalUserId
   * @param {Object} preferencesMap - Preference mapping (e.g. { MARKETING: { EMAIL: false } })
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async update(externalUserId, preferencesMap, options = {}) {
    return this.http.request(
      'PUT',
      `/recipients/${externalUserId}/preferences`,
      { preferences: preferencesMap },
      options
    );
  }
}

module.exports = PreferencesResource;
