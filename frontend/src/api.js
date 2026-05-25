import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email, password) => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const workflowsAPI = {
  list: async () => {
    const response = await api.get('/workflows');
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },
  create: async (workflowData) => {
    const response = await api.post('/workflows', workflowData);
    return response.data;
  },
  update: async (id, workflowData) => {
    const response = await api.put(`/workflows/${id}`, workflowData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/workflows/${id}`);
    return response.data;
  },
  run: async (id) => {
    const response = await api.post(`/workflows/${id}/run`);
    return response.data;
  },
  executions: async (id) => {
    const response = await api.get(`/workflows/${id}/executions`);
    return response.data;
  },
};

export const executionsAPI = {
  get: async (id) => {
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },
};

export default api;
