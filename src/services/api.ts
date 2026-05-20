import axios from 'axios';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  // Use HttpOnly cookies instead of Authorization header
  config.withCredentials = true;

  config.headers['X-Site-Token'] = import.meta.env.VITE_SITE_TOKEN;

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 429) {
      console.warn("Çok hızlı işlem yapıyorsunuz. Sistem engelledi ama oturumunuz açık.");
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      if (!requestUrl.toLowerCase().includes('/user/me')) {
        window.location.href = '/login';
      }
    }

    if (error.response && error.response.status === 503) {
      const maintenanceMessage = error.response.data.message || "Sistem bakımdadır.";
      sessionStorage.setItem('maintenance_message', maintenanceMessage);

      const currentPath = window.location.pathname.toLowerCase();
      const isProtectedPage = !currentPath.includes('/login') &&
        !currentPath.includes('/maintenance');

      if (isProtectedPage) {
        window.location.href = '/maintenance';
      }
    }

    return Promise.reject(error);
  }
);

export default api;