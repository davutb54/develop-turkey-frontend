import axios from 'axios';

const BASE_URL = 'https://localhost:7216/api';

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
      // Eğer hata alınan uç nokta '/user/me' ise yönlendirme yapma, AuthContext bunu yakalayacak.
      // Aksi halde sonsuz logine yönlendirme döngüsüne girer.
      if (!requestUrl.toLowerCase().includes('/user/me')) {
          window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;