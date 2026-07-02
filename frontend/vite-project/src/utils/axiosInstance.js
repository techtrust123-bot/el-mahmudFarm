import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
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
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (error.response.data.code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          }).then(token => {
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
              processQueue(null);
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
      } else if (error.response.data.code === 'NO_TOKEN' || error.response.data.code === 'INVALID_TOKEN') {
        forceLogout();
      }
    }

    if (
      error.response?.status === 403 &&
      ['NOT_SUBSCRIBED', 'SUBSCRIPTION_EXPIRED'].includes(error.response.data.code)
    ) {
      window.location.href = '/payment'
      return Promise.reject(error)
    }

    return Promise.reject(error);
  }
);

const forceLogout = () => {
  localStorage.clear();
  window.location.href = '/login';
};

export default axiosInstance;