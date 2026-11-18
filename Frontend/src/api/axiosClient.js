
import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

const TOKEN_KEY = "summit_access_token";
const USER_KEY = "user";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),

  set: (token) => localStorage.setItem(TOKEN_KEY, token),

  clear: () => localStorage.removeItem(TOKEN_KEY),
};

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

axiosClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.get();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    const isPublicAuthRequest =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    if (status === 401 && !isPublicAuthRequest) {
      tokenStore.clear();
      userStore.clear();
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  (error.request
    ? "Cannot reach the server. Check your connection."
    : error.message);

export default axiosClient;


