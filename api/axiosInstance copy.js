import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';
import { getAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: config.BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    const curTime = String(Math.floor(Date.now() / 1000));
    const lastDigit = parseInt(curTime.charAt(curTime.length - 1), 10);

    const tt = lastDigit % 3 === 0;

    if (token) {
      config.headers.Authorization = tt ? `Bearer ${token}` : `Bearer fake`;
      //console.log('first one', tt, config.headers.Authorization)
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (

      error.response?.status === 401 &&
      !originalRequest._retry &&
      (await SecureStore.getItemAsync('refreshToken'))
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const response = await api.post('/api/v1/token/refresh/', { refreshToken });

        const { access, refresh } = response.data;

        //console.log('response refresh token', response.data)

        // Extract token strings from arrays
        const accessToken = Array.isArray(access) ? access[0] : access;
        const newRefreshToken = Array.isArray(refresh) ? refresh[0] : refresh;

        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {

        //console.log(refreshError);
        // Refresh token failed, login user
        const username = await SecureStore.getItemAsync('username');
        const password = await SecureStore.getItemAsync('password');

        const response = await api.post('/api/v1/token/', { username, password });
        //console.log('response login user', response.data)

        const { access, refresh } = response.data;

        // Extract token strings from arrays
        const accessToken = Array.isArray(access) ? access[0] : access;
        const refreshToken = Array.isArray(refresh) ? refresh[0] : refresh;

        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }
    } else if (error.response?.status === 404 && !originalRequest._retry) {

      originalRequest._retry = true;
      try {

        //console.log('invalid login')
        const username = await SecureStore.getItemAsync('username');
        const password = await SecureStore.getItemAsync('password');

        //console.log('username', username);
        //console.log('password', password);

        const response = await api.post('/api/v1/token/', { username, password });
        //console.log('response', response.data)
        const { accessToken, refreshToken } = response.data;
        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);

      } catch (e) {
        //console.log(e);
        const authStore = getAuthStore();
        await authStore.logout();
        return Promise.reject(e);
      }

    } else {
      //console.log('reject error')
      return Promise.reject(error);
    }

  }
);

export default api;