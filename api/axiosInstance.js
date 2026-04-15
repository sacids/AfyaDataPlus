import axios from 'axios';
import { config } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import useProjectStore from '../store/projectStore';

const api = axios.create();

// Request interceptor - sets baseURL and auth token
api.interceptors.request.use(
  async (req) => {
    // Get current project from store
    const { currentProject } = useProjectStore.getState();

    // Determine base URL to use
    // If this is a Hub operation (registration, browsing public projects),
    // we need to explicitly use Hub URL. For now, we check if there's a special flag
    // or we can assume all requests go to instance_url if currentProject exists
    let baseURL;

    if (req.useHub) {
      // Use Hub URL for public operations (registration, browsing projects)
      baseURL = config.AFYADATA_HUB_URL;
      console.log('Using Hub URL:', baseURL);
    } else if (currentProject?.instance_url) {
      // Use project instance URL for authenticated operations
      baseURL = currentProject.instance_url;
      console.log('Using Instance URL:', baseURL);
    } else {
      // Fallback to Hub URL if no project selected
      baseURL = config.AFYADATA_HUB_URL;
      console.log('Using default Hub URL:', baseURL);
    }

    // Set the baseURL
    req.baseURL = baseURL;

    // Add authentication token for instance requests
    // Skip auth for Hub requests that are public
    const isPublicHubRequest = req.useHub;

    if (!isPublicHubRequest && currentProject?.instance_url) {
      try {
        // Get token for this specific instance
        const instanceOrigin = new URL(currentProject.instance_url).origin;
        const token = useAuthStore.getState().getTokenForUrl(instanceOrigin);

        if (token) {
          req.headers.Authorization = `Bearer ${token}`;
          console.log('Added auth token for instance:', instanceOrigin);
        } else {
          console.log('No token found for instance:', instanceOrigin);
        }
      } catch (e) {
        console.warn('Could not get token for instance:', e);
      }
    }

    console.log(`Request: ${req.method?.toUpperCase()} ${baseURL}${req.url}`);

    return req;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry if it's not a 401 or already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't retry Hub requests
    if (originalRequest.baseURL === config.AFYADATA_HUB_URL) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Get the instance URL that failed
      const { currentProject } = useProjectStore.getState();
      if (!currentProject?.instance_url) {
        throw new Error('No current project instance URL');
      }

      const instanceOrigin = new URL(currentProject.instance_url).origin;
      const { user, setInstanceSession } = useAuthStore.getState();

      // Check if we have credentials for auto-login
      if (!user?.globalUsername || !user?.password) {
        throw new Error('No global credentials found for auto-login');
      }

      console.log(`Attempting auto-login for instance: ${instanceOrigin}`);

      // Call token endpoint on the specific instance
      const loginResponse = await axios.post(`${instanceOrigin}/api/v1/token/`, {
        username: user.globalUsername,
        password: user.password,
      });

      const { access } = loginResponse.data;

      // Update store with new token
      setInstanceSession(instanceOrigin, access, user.globalUsername);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);

    } catch (authError) {
      console.error('Auto-login failed:', authError);
      // Clear token for this instance
      const { currentProject } = useProjectStore.getState();
      if (currentProject?.instance_url) {
        const instanceOrigin = new URL(currentProject.instance_url).origin;
        useAuthStore.getState().clearInstanceToken(instanceOrigin);
      }
      return Promise.reject(authError);
    }
  }
);

// Helper method to explicitly make Hub requests
export const hubApi = axios.create({
  baseURL: config.AFYADATA_HUB_URL
});

// Helper to check if we're using instance or hub
export const isUsingInstance = () => {
  const { currentProject } = useProjectStore.getState();
  return !!currentProject?.instance_url;
};

// Helper to get current base URL
export const getCurrentBaseURL = () => {
  const { currentProject } = useProjectStore.getState();
  return currentProject?.instance_url || config.AFYADATA_HUB_URL;
};

export default api;