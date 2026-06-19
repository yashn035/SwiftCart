import axios from 'axios';

// In development, VITE_API_URL is typically unset and Vite's dev-server proxy
// rewrites /api → http://localhost:5000/api.
// In production (Vercel etc.) VITE_API_URL must be set to the full backend URL
// (e.g. https://swiftcart-backend.onrender.com) so requests reach the real server.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swiftcart_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — clear token and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('swiftcart_token');
      localStorage.removeItem('swiftcart_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
