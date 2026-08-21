class TemplatesResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Note: Template management endpoints are accessed via Project routes in the REST API.
   * Developers configure templates via Dashboard or Project API keys.
   */
  async list(projectId, params = {}, options = {}) {
    const query = new URLSearchParams(params).toString();
    const path = `/projects/${projectId}/templates${query ? `?${query}` : ''}`;
    return this.http.request('GET', path, null, options);
  }

  async get(projectId, templateId, options = {}) {
    return this.http.request('GET', `/projects/${projectId}/templates/${templateId}`, null, options);
  }

  async create(projectId, { name, channel, subject, body }, options = {}) {
    return this.http.request(
      'POST',
      `/projects/${projectId}/templates`,
      { name, channel, subject, body },
      options
    );
  }

  async update(projectId, templateId, { subject, body }, options = {}) {
    return this.http.request(
      'PUT',
      `/projects/${projectId}/templates/${templateId}`,
      { subject, body },
      options
    );
  }

  async delete(projectId, templateId, options = {}) {
    return this.http.request(
      'DELETE',
      `/projects/${projectId}/templates/${templateId}`,
      null,
      options
    );
  }
}

module.exports = TemplatesResource;
