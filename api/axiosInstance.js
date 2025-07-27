import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import { getDeviceId } from '../utils/deviceUtils';
import { generatePassword } from '../utils/passwordUtils';

const api = axios.create({
  baseURL: config.BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // First, try to refresh the token
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        const response = await axios.post(`${config.BASE_URL}/api/v1/token/refresh/`, { refresh: refreshToken });
        const { access, refresh } = response.data;

        await SecureStore.setItemAsync('accessToken', access);
        await SecureStore.setItemAsync('refreshToken', refresh);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      }

      // If no refresh token, attempt login with deterministic credentials
      const username = getDeviceId();
      const password = await generatePassword(username);

      const response = await axios.post(`${config.BASE_URL}/api/v1/token/`, {
        username,
        password,
      });

      const { access, refresh, user } = response.data;

      await SecureStore.setItemAsync('accessToken', access);
      await SecureStore.setItemAsync('refreshToken', refresh);
      await SecureStore.setItemAsync('username', username);
      await SecureStore.setItemAsync('password', password);
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      useAuthStore.getState().setUser(user);
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);
    } catch (authError) {
      console.error('Authentication failed:', authError);
      await useAuthStore.getState().logout();
      router.replace('/(auth)/start');
      return Promise.reject(authError);
    }
  }
);

export default api;