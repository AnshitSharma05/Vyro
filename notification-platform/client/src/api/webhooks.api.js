import api from './axios.config';

export const webhooksApi = {
  listWebhooks: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/webhooks`);
    return response.data;
  },

  createWebhook: async (projectId, data) => {
    const response = await api.post(`/projects/${projectId}/webhooks`, data);
    return response.data;
  },

  updateWebhook: async (projectId, webhookId, data) => {
    const response = await api.patch(`/projects/${projectId}/webhooks/${webhookId}`, data);
    return response.data;
  },

  deleteWebhook: async (projectId, webhookId) => {
    const response = await api.delete(`/projects/${projectId}/webhooks/${webhookId}`);
    return response.data;
  },

  listWebhookDeliveries: async (projectId, webhookId, params) => {
    const response = await api.get(`/projects/${projectId}/webhooks/${webhookId}/deliveries`, { params });
    return response.data;
  },
};
