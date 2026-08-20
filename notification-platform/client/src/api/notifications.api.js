import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const listNotifications = async (projectId, params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/notifications`, { params });
  return response.data;
};

export const getNotification = async (projectId, notificationId) => {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/notifications/${notificationId}`);
  return response.data;
};
