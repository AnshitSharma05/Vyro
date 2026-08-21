class DevicesResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Register or update a push device token for a recipient.
   *
   * @param {string} externalUserId
   * @param {Object} input
   * @param {string} input.token - Push device token
   * @param {string} [input.platform=WEB] - IOS, ANDROID, or WEB
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async register(externalUserId, { token, platform = 'WEB' }, options = {}) {
    return this.http.request(
      'POST',
      `/recipients/${externalUserId}/devices`,
      { token, platform },
      options
    );
  }

  /**
   * List active push devices registered for a recipient.
   *
   * @param {string} externalUserId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async list(externalUserId, options = {}) {
    return this.http.request('GET', `/recipients/${externalUserId}/devices`, null, options);
  }

  /**
   * Deactivate a push device for a recipient.
   *
   * @param {string} externalUserId
   * @param {string} deviceId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async remove(externalUserId, deviceId, options = {}) {
    return this.http.request(
      'DELETE',
      `/recipients/${externalUserId}/devices/${deviceId}`,
      null,
      options
    );
  }
}

module.exports = DevicesResource;
