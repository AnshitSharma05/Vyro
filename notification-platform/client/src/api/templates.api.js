import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const listTemplates = async (projectId, params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/templates`, { params });
  return response.data;
};

export const getTemplate = async (projectId, templateId) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/templates/${templateId}`);
  return response.data;
};

export const createTemplate = async (projectId, data) => {
  const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/templates`, data);
  return response.data;
};

export const updateTemplate = async (projectId, templateId, data) => {
  const response = await axios.patch(`${API_BASE_URL}/projects/${projectId}/templates/${templateId}`, data);
  return response.data;
};

export const deleteTemplate = async (projectId, templateId) => {
  const response = await axios.delete(`${API_BASE_URL}/projects/${projectId}/templates/${templateId}`);
  return response.data;
};

export const previewTemplate = async (projectId, data) => {
  const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/templates/preview`, data);
  return response.data;
};
