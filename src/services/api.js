import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL: 'https://dashboard-ofrecetutalento.com:3600/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Auth API
export const registerUser = (userData) => {
  return api.post('/auth/register', userData);
};

export const loginUser = (userData) => {
  return api.post('/auth/login', userData);
};

export const getCurrentUser = () => {
  return api.get('/auth/me');
};

// CSV API
export const uploadCSV = (formData) => {
  return api.post('/csv/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getCSVFiles = () => {
  return api.get('/csv/files');
};

export const downloadCSV = (fileId) => {
  return api.get(`/csv/download/${fileId}`, {
    responseType: 'blob'
  });
};

export const compareCSVFiles = (originalId, compareId) => {
  return api.post('/csv/compare', { originalId, compareId });
};

export const updateOriginalCSV = (originalId, changes) => {
  return api.post('/csv/update', { originalId, changes });
};

export default api;
