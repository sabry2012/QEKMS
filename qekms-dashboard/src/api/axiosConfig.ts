import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  // NOTE: Do NOT set a global Content-Type here.
  // axios sets 'application/json' automatically for plain objects,
  // and 'multipart/form-data' (with boundary) automatically for FormData.
  // A global override would break multipart file/message uploads.
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
        // If refresh fails, redirect to login or let the component handle it
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;