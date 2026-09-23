import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

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

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const authErrorCode = error.response?.data?.code;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (authErrorCode === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axiosInstance(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        return new Promise(function(resolve, reject) {
          axiosInstance.post('/api/auth/refresh')
            .then(({ data }) => {
              processQueue(null, data?.token || null);
              resolve(axiosInstance(originalRequest));
            })
            .catch((err) => {
              processQueue(err, null);
              forceLogout();
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }

      if (
        authErrorCode === 'NO_TOKEN' ||
        authErrorCode === 'INVALID_TOKEN' ||
        authErrorCode === 'REFRESH_TOKEN_INVALID' ||
        authErrorCode === 'TOKEN_EXPIRED'
      ) {
        forceLogout();
      }
    }

    if (
      error.response?.status === 403 &&
      ['NOT_SUBSCRIBED', 'SUBSCRIPTION_EXPIRED'].includes(error.response.data.code)
    ) {
      window.location.replace('/subscription');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

const forceLogout = () => {
  if (window.isRedirecting) return;

  const publicPages = ['/', '/login', '/register', '/forgot-password', '/verify-otp', '/reset-password', '/support/contact', '/terms', '/privacy-policy', '/forbidden'];
  const currentPath = window.location.pathname;

  localStorage.clear();
  sessionStorage.clear();

  // Idan yana kan Landing Page ('/'), kawai bar shi a wajen, kada ka tusa shi /login
  if (!publicPages.includes(currentPath)) {
    window.isRedirecting = true;
    window.location.replace('/login?reason=session_expired');
  }
};
// const forceLogout = () => {
//   if (window.isRedirecting) return;
//   window.isRedirecting = true;

//   localStorage.clear();
//   sessionStorage.clear();

//   if (window.location.pathname !== '/login') {
//     window.location.replace('/login?reason=session_expired');
//   }
// };

export default axiosInstance;