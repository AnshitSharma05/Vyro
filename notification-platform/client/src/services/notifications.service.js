import { apiClient } from '../api/client';

export const notificationsService = {
  async listDashboard(projectId, { status, channel, page = 1, limit = 50 } = {}) {
    if (!projectId) return { notifications: [], totalCount: 0 };
    const params = { page, limit };
    if (status && status !== 'ALL') params.status = status;
    if (channel && channel !== 'ALL') params.channel = channel;
    const res = await apiClient.get(`/projects/${projectId}/notifications`, { params });
    return res.data?.data || { notifications: [], totalCount: 0 };
  },

  async getDashboard(projectId, notificationId) {
    const res = await apiClient.get(`/projects/${projectId}/notifications/${notificationId}`);
    return res.data?.data;
  },

  async cancel(projectId, notificationId) {
    const res = await apiClient.post(`/projects/${projectId}/notifications/${notificationId}/cancel`);
    return res.data?.data;
  },

  async sendTest({ apiKey, channel, category = 'TRANSACTIONAL', template, recipient, data = {} }) {
    const res = await apiClient.post(
      '/notifications/send',
      {
        channel,
        category,
        template,
        recipient,
        data,
      },
      {
        headers: {
          'X-API-Key': apiKey || 'np_dev_dev_secret_key_1234567890',
        },
      }
    );
    return res.data?.data;
  },
};
