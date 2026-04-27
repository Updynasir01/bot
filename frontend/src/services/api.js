import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/password', data),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Businesses
export const businessAPI = {
  getAll: (params) => api.get('/businesses', { params }),
  getOne: (id) => api.get(`/businesses/${id}`),
  create: (data) => api.post('/businesses', data),
  update: (id, data) => api.put(`/businesses/${id}`, data),
  delete: (id) => api.delete(`/businesses/${id}`),
  toggleBot: (id) => api.post(`/businesses/${id}/toggle-bot`),
  testBot: (id, message) => api.post(`/businesses/${id}/test-bot`, { message }),
};

// Files
export const fileAPI = {
  upload: (businessId, formData) => api.post(`/businesses/${businessId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (businessId) => api.get(`/businesses/${businessId}/files`),
  delete: (id) => api.delete(`/files/${id}`),
};

// Messages
export const messageAPI = {
  getAll: (businessId, params) => api.get(`/businesses/${businessId}/messages`, { params }),
  send: (businessId, data) => api.post(`/businesses/${businessId}/messages/send`, data),
};

// Payments
export const paymentAPI = {
  getAll: () => api.get('/payments'),
  record: (businessId, data) => api.post(`/businesses/${businessId}/payments`, data),
  getAnalytics: () => api.get('/payments/analytics'),
};

// Analytics
export const analyticsAPI = {
  get: () => api.get('/analytics'),
};

export default api;
