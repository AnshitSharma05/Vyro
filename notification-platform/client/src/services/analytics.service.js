import { apiClient } from '../api/client';

export const analyticsService = {
  async getOverview({ startDate, endDate } = {}) {
    try {
      const res = await apiClient.get('/analytics/overview', {
        params: { startDate, endDate },
      });
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  async getChannels({ startDate, endDate } = {}) {
    try {
      const res = await apiClient.get('/analytics/channels', {
        params: { startDate, endDate },
      });
      return res.data?.data || [];
    } catch {
      return [];
    }
  },
};
