import axios from 'axios';
import { config } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import useProjectStore from '../store/projectStore';

const api = axios.create();

// Helper to check if URL is absolute (has protocol)
const isAbsoluteUrl = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

// Helper to get origin from URL
const getOriginFromUrl = (url) => {
  try {
    return new URL(url).origin;
  } catch (e) {
    return null;
  }
};

// Request interceptor - sets baseURL and auth token
api.interceptors.request.use(
  async (req) => {
    // Get current project from store
    const { currentProject } = useProjectStore.getState();

    let baseURL;
    let targetOrigin = null;

    // Check if request URL is absolute
    if (req.url && isAbsoluteUrl(req.url)) {
      // For absolute URLs, no baseURL needed
      baseURL = '';
      targetOrigin = getOriginFromUrl(req.url);
      //console.log('Using absolute URL (no baseURL):', req.url);
    } else {
      // Determine base URL to use for relative paths
      if (req.useHub) {
        // Use Hub URL for public operations (registration, browsing projects)
        baseURL = config.AFYADATA_HUB_URL;
        targetOrigin = getOriginFromUrl(baseURL);
        //console.log('Using Hub URL:', baseURL);
      } else if (currentProject?.instance_url) {
        // Use project instance URL for authenticated operations
        baseURL = currentProject.instance_url;
        targetOrigin = getOriginFromUrl(baseURL);
        ////console.log('Using Instance URL:', baseURL);
      } else {
        // Fallback to Hub URL if no project selected
        baseURL = config.AFYADATA_HUB_URL;
        targetOrigin = getOriginFromUrl(baseURL);
        //console.log('Using default Hub URL:', baseURL);
      }
    }

    // Set the baseURL
    req.baseURL = baseURL;

    // Add authentication token for instance requests
    // Skip auth for Hub requests that are public
    const isPublicHubRequest = req.useHub;

    if (!isPublicHubRequest && targetOrigin) {
      try {
        // Get token for this specific origin
        const token = useAuthStore.getState().getTokenForUrl(targetOrigin);

        if (token) {
          req.headers.Authorization = `Bearer ${token}`;
          //console.log('Added auth token for origin:', targetOrigin);
        } else {
          //console.log('No token found for origin:', targetOrigin);
        }
      } catch (e) {
        console.warn('Could not get token for origin:', e);
      }
    }

    const finalUrl = baseURL ? `${baseURL}${req.url}` : req.url;
    //console.log(`Request: ${req.method?.toUpperCase()} ${finalUrl}`);

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

    // Determine the target origin from the request
    let targetOrigin = null;
    if (originalRequest.url && isAbsoluteUrl(originalRequest.url)) {
      targetOrigin = getOriginFromUrl(originalRequest.url);
    } else if (originalRequest.baseURL) {
      targetOrigin = getOriginFromUrl(originalRequest.baseURL);
    }

    // Don't retry Hub requests
    if (targetOrigin === getOriginFromUrl(config.AFYADATA_HUB_URL)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { user, setInstanceSession } = useAuthStore.getState();

      // Check if we have credentials for auto-login
      if (!user?.globalUsername || !user?.password) {
        throw new Error('No global credentials found for auto-login');
      }

      console.log(`Attempting auto-login for origin: ${targetOrigin}`);

      // Call token endpoint on the specific instance
      const loginResponse = await axios.post(`${targetOrigin}/api/v1/token/`, {
        username: user.globalUsername,
        password: user.password,
      });

      const { access } = loginResponse.data;

      // Update store with new token for this origin
      setInstanceSession(targetOrigin, access, user.globalUsername);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);

    } catch (authError) {
      console.error('Auto-login failed:', authError);
      // Clear token for this origin
      if (targetOrigin) {
        useAuthStore.getState().clearInstanceToken(targetOrigin);
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

// Helper to make requests with absolute URLs
export const absoluteRequest = async (absoluteUrl, options = {}) => {
  const { method = 'GET', data, headers = {} } = options;

  const targetOrigin = getOriginFromUrl(absoluteUrl);
  const token = useAuthStore.getState().getTokenForUrl(targetOrigin);

  const config = {
    method,
    url: absoluteUrl,
    data,
    headers: {
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };

  return api(config);
};

export default api;