import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';
import { getAuthStore } from '../store/authStore';

// Create axios instance
const api = axios.create({
  baseURL: config.BASE_URL,
});

/**
 * Helper function to extract token from possible array response
 */
const extractToken = (token) => {
  return Array.isArray(token) ? token[0] : token;
};

/**
 * Attempts to login with stored credentials
 */
const attemptLogin = async () => {
  try {
    const username = await SecureStore.getItemAsync('username');
    const password = await SecureStore.getItemAsync('password');

    if (!username || !password) {
      throw new Error('No credentials stored');
    }

    const response = await api.post('/api/v1/token/', { username, password });
    const { access, refresh } = response.data;

    const accessToken = extractToken(access);
    const refreshToken = extractToken(refresh);

    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);

    return accessToken;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Attempts to refresh the access token
 */
const attemptRefresh = async () => {
  try {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/api/v1/token/refresh/', { refreshToken });
    const { access, refresh } = response.data;

    const newAccessToken = extractToken(access);
    const newRefreshToken = extractToken(refresh);

    await SecureStore.setItemAsync('accessToken', newAccessToken);
    await SecureStore.setItemAsync('refreshToken', newRefreshToken);

    return newAccessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Test code to simulate intermittent token failures
    // const curTime = String(Math.floor(Date.now() / 1000));
    // const lastDigit = parseInt(curTime.charAt(curTime.length - 1), 10);
    //const simulateInvalidToken = lastDigit % 3 === 0;

    const simulateInvalidToken = false

    const token = await SecureStore.getItemAsync('accessToken');

    if (token) {
      // Use fake token for testing when simulateInvalidToken is true
      config.headers.Authorization = `Bearer ${simulateInvalidToken ? 'fake' : token}`;
      //console.log('Token attached:', simulateInvalidToken ? 'INVALID (test)' : 'VALID');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry logic if already retried or not a 401 error
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // First attempt: Try to refresh the token
      const newAccessToken = await attemptRefresh();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);

    } catch (refreshError) {
      //console.log('Refresh failed, attempting full login...', refreshError);

      try {
        // Second attempt: Try to login with stored credentials
        //console.log('attempting login')
        const newAccessToken = await attemptLogin();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (loginError) {
        //console.log('Login failed, logging out...');

        // Final fallback: Logout the user
        const authStore = getAuthStore();
        await authStore.logout();
        return Promise.reject(loginError);
      }
    }
  }
);

export default api;