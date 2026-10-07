import axios from 'axios';
import { useWallet } from '../hooks/useWallet';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = useWallet.getState().jwt;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If server rotated secrets or token expired, cleanly clear stale state
      useWallet.getState().disconnect();
    }
    return Promise.reject(error);
  }
);

export default api;
