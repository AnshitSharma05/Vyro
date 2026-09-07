import { apiClient } from '../api/client';

export const templatesService = {
  async list(projectId, { channel, page = 1, limit = 50 } = {}) {
    if (!projectId) return { templates: [], totalCount: 0 };
    const params = { page, limit };
    if (channel && channel !== 'ALL') {
      params.channel = channel;
    }
    const res = await apiClient.get(`/projects/${projectId}/templates`, { params });
    return res.data?.data || { templates: [], totalCount: 0 };
  },

  async get(projectId, templateId) {
    const res = await apiClient.get(`/projects/${projectId}/templates/${templateId}`);
    return res.data?.data;
  },

  async create(projectId, templateData) {
    const res = await apiClient.post(`/projects/${projectId}/templates`, templateData);
    return res.data?.data;
  },

  async update(projectId, templateId, updateData) {
    const res = await apiClient.patch(`/projects/${projectId}/templates/${templateId}`, updateData);
    return res.data?.data;
  },

  async delete(projectId, templateId) {
    const res = await apiClient.delete(`/projects/${projectId}/templates/${templateId}`);
    return res.data;
  },

  async preview(projectId, previewData) {
    const res = await apiClient.post(`/projects/${projectId}/templates/preview`, previewData);
    return res.data?.data;
  },
};
