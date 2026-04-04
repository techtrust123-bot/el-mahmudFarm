import axios from 'axios';

// Configure API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for cookies
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

// Process queued requests after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Add request interceptor to include auth token (if needed for headers)
apiClient.interceptors.request.use(
  (config) => {
    // Cookies are sent automatically with withCredentials: true
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple redirects
let isRedirecting = false;

const redirectToLogin = () => {
  if (isRedirecting || window.isRedirecting) return;
  isRedirecting = true;
  window.isRedirecting = true;

  // Only redirect if not already on login page
  if (window.location.pathname !== '/login') {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      // Don't redirect for auth endpoints that are expected to fail
      if (originalRequest.url?.includes('/auth/') ||
          originalRequest.url?.includes('/user/userData')) {
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
  forgotPassword: (email) => apiClient.post('/auth/send-reset-otp', { email }),
  logout: () => apiClient.post('/auth/logout'),
  refresh: () => apiClient.post('/auth/refresh'),
  getUserData: () => apiClient.get('/user/userData'),
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
