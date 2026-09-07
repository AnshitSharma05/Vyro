import { apiClient } from '../api/client';

export const apiKeysService = {
  async list(projectId, { page = 1, limit = 50 } = {}) {
    if (!projectId) return { apiKeys: [], totalCount: 0 };
    const res = await apiClient.get(`/projects/${projectId}/api-keys`, {
      params: { page, limit },
    });
    return res.data?.data || { apiKeys: [], totalCount: 0 };
  },

  async create(projectId, { name, scopes = ['notifications:write', 'notifications:read'] }) {
    const res = await apiClient.post(`/projects/${projectId}/api-keys`, { name, scopes });
    return res.data?.data;
  },

  async revoke(projectId, apiKeyId) {
    const res = await apiClient.post(`/projects/${projectId}/api-keys/${apiKeyId}/revoke`);
    return res.data?.data;
  },
};
