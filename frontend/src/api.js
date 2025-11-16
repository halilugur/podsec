import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const secretsApi = {
  // Get all secrets
  listSecrets: async () => {
    const response = await api.get('/api/secrets');
    return response.data;
  },

  // Create a new secret
  createSecret: async (name, data) => {
    const response = await api.post('/api/secrets', { name, data });
    return response.data;
  },

  // Create multiple secrets
  createBulkSecrets: async (secrets) => {
    const response = await api.post('/api/secrets/bulk', { secrets });
    return response.data;
  },

  // Get secret details
  inspectSecret: async (secretId) => {
    const response = await api.get(`/api/secrets/${secretId}`);
    return response.data;
  },

  // Delete a secret
  deleteSecret: async (secretId) => {
    const response = await api.delete(`/api/secrets/${secretId}`);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default api;
