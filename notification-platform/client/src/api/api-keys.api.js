import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const listApiKeys = async (projectId) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/api-keys`);
  return response.data;
};

export const createApiKey = async (projectId, data) => {
  const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/api-keys`, data);
  return response.data;
};

export const revokeApiKey = async (projectId, apiKeyId) => {
  const response = await axios.post(
    `${API_BASE_URL}/projects/${projectId}/api-keys/${apiKeyId}/revoke`
  );
  return response.data;
};
