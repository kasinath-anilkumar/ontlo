import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin';

const adminApi = axios.create({
  baseURL: API_URL,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getStats = () => adminApi.get('/stats');
export const getUsers = (params) => adminApi.get('/users', { params });
export const performUserAction = (id, data) => adminApi.post(`/users/${id}/action`, data);
export const getReports = () => adminApi.get('/reports');

export default adminApi;
