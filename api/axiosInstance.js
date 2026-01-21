import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import { getDeviceId } from '../utils/deviceUtils';
import { generatePassword } from '../utils/passwordUtils';

const api = axios.create({
  baseURL: config.BASE_URL,
});

api.interceptors.request.use(
  async (req) => {
    const tokenData = await SecureStore.getItemAsync(config.TOKEN_KEY);
    if (tokenData) {
      const { access } = JSON.parse(tokenData);
      req.headers.Authorization = `Bearer ${access}`;
    }
    return req;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's not a 401, or we've already tried to auto-login for THIS request, fail.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      console.log('Token expired. Attempting device auto-login...');
      
      const username = getDeviceId();
      const password = await generatePassword(username);
      
      // Request new tokens using device credentials
      const loginResponse = await axios.post(`${config.BASE_URL}/api/v1/token/`, {
        username,
        password,
      });
      
      const { access, refresh, user } = loginResponse.data;

      // Update SecureStore (Shared with AuthContext)
      const authData = { access, refresh, user };
      await SecureStore.setItemAsync(config.TOKEN_KEY, JSON.stringify(authData));

      // Update Zustand
      if (user) useAuthStore.getState().setUser(user);

      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);

    } catch (authError) {
      console.error('Auto-login fallback failed:', authError);
      await SecureStore.deleteItemAsync(config.TOKEN_KEY);
      useAuthStore.getState().logout();
      return Promise.reject(authError);
    }
  }
);

export default api;