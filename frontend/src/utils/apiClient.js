import axios from 'axios';
import apiConfig from '../config/api';

const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Separate client for refresh calls to avoid interceptor loops
const refreshClient = axios.create({
  baseURL: apiConfig.baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Single-flight promise for refresh requests to avoid concurrent rotation issues
let refreshPromise = null;
async function tryRefreshToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const resp = await refreshClient.post(apiConfig.endpoints.auth.refresh);
      if (resp?.data?.accessToken) {
        localStorage.setItem('accessToken', resp.data.accessToken);
        return true;
      }
    } catch (err) {
      // ignore and let caller handle redirect
    } finally {
      refreshPromise = null;
    }
    return false;
  })();

  return refreshPromise;
}

// Add request interceptor to include JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const token = localStorage.getItem('accessToken');
        if (token) originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userEmail');
      globalThis.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { refreshClient };
