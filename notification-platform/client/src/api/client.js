import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vyro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errData = error.response?.data;
    let customMessage = 'Network error or server unavailable';
    if (errData) {
      if (errData.error?.message) {
        customMessage = errData.error.message;
        if (Array.isArray(errData.error.details) && errData.error.details.length > 0) {
          const detailsList = errData.error.details
            .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
            .join('; ');
          customMessage += ` - ${detailsList}`;
        }
      } else if (errData.message) {
        customMessage = errData.message;
      }
    } else if (error.message) {
      customMessage = error.message;
    }
    return Promise.reject(new Error(customMessage));
  }
);

