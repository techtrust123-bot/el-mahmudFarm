import axios from 'axios';

// Configure API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API calls
 */
export const authAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (data) => apiClient.post('/auth/register', data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  logout: () => apiClient.post('/auth/logout'),
};

/**
 * Livestock API calls
 */
export const livestockAPI = {
  getAll: () => apiClient.get('/livestock'),
  getById: (id) => apiClient.get(`/livestock/${id}`),
  create: (data) => apiClient.post('/livestock', data),
  update: (id, data) => apiClient.put(`/livestock/${id}`, data),
  delete: (id) => apiClient.delete(`/livestock/${id}`),
};

/**
 * Poultry API calls
 */
export const poultryAPI = {
  getAll: () => apiClient.get('/poultry'),
  getById: (id) => apiClient.get(`/poultry/${id}`),
  create: (data) => apiClient.post('/poultry', data),
  update: (id, data) => apiClient.put(`/poultry/${id}`, data),
  delete: (id) => apiClient.delete(`/poultry/${id}`),
};

/**
 * Feed API calls
 */
export const feedAPI = {
  getAll: () => apiClient.get('/feed'),
  getById: (id) => apiClient.get(`/feed/${id}`),
  create: (data) => apiClient.post('/feed', data),
  update: (id, data) => apiClient.put(`/feed/${id}`, data),
  delete: (id) => apiClient.delete(`/feed/${id}`),
};

/**
 * Sales API calls
 */
export const salesAPI = {
  getAll: () => apiClient.get('/sales'),
  getById: (id) => apiClient.get(`/sales/${id}`),
  create: (data) => apiClient.post('/sales', data),
  update: (id, data) => apiClient.put(`/sales/${id}`, data),
  delete: (id) => apiClient.delete(`/sales/${id}`),
  generateInvoice: (id) => apiClient.get(`/sales/${id}/invoice`),
};

/**
 * Expense API calls
 */
export const expenseAPI = {
  getAll: () => apiClient.get('/expenses'),
  getById: (id) => apiClient.get(`/expenses/${id}`),
  create: (data) => apiClient.post('/expenses', data),
  update: (id, data) => apiClient.put(`/expenses/${id}`, data),
  delete: (id) => apiClient.delete(`/expenses/${id}`),
};

/**
 * Staff API calls
 */
export const staffAPI = {
  getAll: () => apiClient.get('/staff'),
  getById: (id) => apiClient.get(`/staff/${id}`),
  create: (data) => apiClient.post('/staff', data),
  update: (id, data) => apiClient.put(`/staff/${id}`, data),
  delete: (id) => apiClient.delete(`/staff/${id}`),
};

/**
 * Dashboard API calls
 */
export const dashboardAPI = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getChartData: () => apiClient.get('/dashboard/charts'),
};

export default apiClient;
