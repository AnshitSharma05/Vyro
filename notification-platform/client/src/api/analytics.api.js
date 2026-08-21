import api from './axios.config';

export const analyticsApi = {
  getOverview: async (projectId, params = {}) => {
    const response = await api.get('/analytics/overview', {
      params: { projectId, ...params },
    });
    return response.data;
  },

  getChannels: async (projectId, params = {}) => {
    const response = await api.get('/analytics/channels', {
      params: { projectId, ...params },
    });
    return response.data;
  },

  getOrganization: async (organizationId, params = {}) => {
    const response = await api.get('/analytics/organization', {
      params: { organizationId, ...params },
    });
    return response.data;
  },
};
