import axios from 'axios';

const BASE_URL = '/api'; 

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
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
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      
      window.location.href = '/login'; 
    }

    return Promise.reject(error);
  }
);

export default api;