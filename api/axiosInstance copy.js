import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';
import { useAuthStore } from '../store/authStore';

//console.log('base url', config.BASE_URL)

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

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {



      // Retrieve manually entered credentials saved during Register/Login
      const username = await SecureStore.getItemAsync('saved_username');
      const password = await SecureStore.getItemAsync('saved_password');

      console.log('saved username', username, password)


      if (!username || !password) {
        throw new Error('No saved credentials for auto-login');
      }

      const loginResponse = await axios.post(`${config.BASE_URL}/api/v1/token/`, {
        username,
        password,
      });

      const { access, refresh, user } = loginResponse.data;
      const authData = { access, refresh, user };

      await SecureStore.setItemAsync(config.TOKEN_KEY, JSON.stringify(authData));
      if (user) useAuthStore.getState().setUser(user);

      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);

    } catch (authError) {
      // Clear credentials on failure to prevent loops
      await SecureStore.deleteItemAsync(config.TOKEN_KEY);
      await SecureStore.deleteItemAsync('saved_username');
      await SecureStore.deleteItemAsync('saved_password');
      useAuthStore.getState().logout();
      return Promise.reject(authError);
    }
  }
);



export default api;