
import axios from "axios";

// Backend URL
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Storage keys
const TOKEN_KEY = "summit_access_token";
const USER_KEY = "user";

// Token storage
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),

  set: (token) => localStorage.setItem(TOKEN_KEY, token),

  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// User storage
export const userStore = {
  get: () => {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  set: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear: () => localStorage.removeItem(USER_KEY),
};

// Attach JWT to requests
axiosClient.interceptors.request.use((config) => {
  const token = tokenStore.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle authentication errors
axiosClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const isLoginCall = error.config?.url?.includes("/auth/login");

    if (status === 401 && !isLoginCall) {
      tokenStore.clear();
      userStore.clear();
      window.location.assign("/login");
    }

    return Promise.reject(error);
  }
);

// Readable API error messages
export const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  (error.request
    ? "Cannot reach the server. Check your connection."
    : error.message);

export default axiosClient;


