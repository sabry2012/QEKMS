import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to rotate refresh token
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        
        // If successful, retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Return original error instead of "Refresh token missing"
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;