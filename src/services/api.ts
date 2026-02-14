import axios from 'axios';

// Backend'in çalıştığı adres (WebAPI/Properties/launchSettings.json'dan alındı)
const BASE_URL = 'https://localhost:7216/api'; 

const api = axios.create({
  baseURL: BASE_URL,
});

// Her istekten önce çalışır (Interceptor)
api.interceptors.request.use((config) => {
  // LocalStorage'da token varsa alıp Header'a ekler
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;