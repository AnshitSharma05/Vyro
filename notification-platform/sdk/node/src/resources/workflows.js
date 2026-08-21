class WorkflowsResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Create a new notification workflow rule.
   *
   * @param {Object} input
   * @param {string} input.name - Workflow rule name
   * @param {string} [input.description]
   * @param {string} input.eventName - Triggering business event name
   * @param {string} [input.status=ACTIVE] - ACTIVE or INACTIVE
   * @param {Array<Object>} input.actions - Ordered notification actions
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async create({ name, description, eventName, status = 'ACTIVE', actions = [] }, options = {}) {
    return this.http.request('POST', '/workflows', {
      name,
      description,
      eventName,
      status,
      actions,
    }, options);
  }

  /**
   * Get workflow rule details by ID.
   *
   * @param {string} workflowId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async get(workflowId, options = {}) {
    return this.http.request('GET', `/workflows/${workflowId}`, null, options);
  }

  /**
   * Update workflow rule definition or status.
   *
   * @param {string} workflowId
   * @param {Object} input ({ name, description, status, eventName, actions })
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async update(workflowId, input, options = {}) {
    return this.http.request('PATCH', `/workflows/${workflowId}`, input, options);
  }

  /**
   * Deactivate a workflow rule (shortcut for update status = INACTIVE).
   *
   * @param {string} workflowId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async deactivate(workflowId, options = {}) {
    return this.update(workflowId, { status: 'INACTIVE' }, options);
  }

  /**
   * List workflow rules.
   *
   * @param {Object} [params] ({ page, limit })
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async list(params = {}, options = {}) {
    const query = new URLSearchParams(params).toString();
    const path = `/workflows${query ? `?${query}` : ''}`;
    return this.http.request('GET', path, null, options);
  }
}

module.exports = WorkflowsResource;
