import axios from 'axios';
import { config } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import useProjectStore from '../../../store/projectStore';

//console.log('base url', config.BASE_URL)

const api = axios.create();


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt retry if it's a 401 and we haven't tried yet
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // 1. Identify which instance failed
      const fullUrl = originalRequest.url.startsWith('http')
        ? originalRequest.url
        : `${originalRequest.baseURL || ''}${originalRequest.url}`;

      const urlObject = new URL(fullUrl);
      const instanceOrigin = urlObject.origin;

      // 2. Get the "Passport" (Global credentials) from the Zustand store
      const { user, setInstanceSession } = useAuthStore.getState();

      // If we don't have a local profile saved yet, we can't auto-login
      if (!user?.globalUsername || !user?.password) {
        throw new Error('No global credentials found for auto-login');
      }

      console.log(`Attempting auto-login for instance: ${instanceOrigin}`);

      // 3. Call the token endpoint on the SPECIFIC instance that failed
      const loginResponse = await axios.post(`${instanceOrigin}/api/v1/token/`, {
        username: user.globalUsername,
        password: user.password,
      });

      const { access } = loginResponse.data;

      // 4. Update the "Wallet" with the new token for this specific instance
      setInstanceSession(instanceOrigin, access, user.globalUsername);

      // 5. Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);

    } catch (authError) {
      console.error('Auto-login failed for instance:', authError);

      // We don't necessarily want to log out of EVERYTHING if one instance fails.
      // Just clear the token for that specific instance so the user is prompted to re-join/login.
      return Promise.reject(authError);
    }
  }
);



export default api;