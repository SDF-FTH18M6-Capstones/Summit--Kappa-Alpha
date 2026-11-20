import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://127.0.0.1:5000/api";


  

const axiosClient = axios.create({
  baseURL: API_URL.replace(/\/+$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

const TOKEN_KEY = "summit_access_token";
const REFRESH_TOKEN_KEY = "summit_refresh_token";
const USER_KEY = "user";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const refreshTokenStore = {
  get: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (token) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(REFRESH_TOKEN_KEY),
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
  set: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => localStorage.removeItem(USER_KEY),
};

axiosClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.get();
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    const url = originalRequest.url || "";

    const isPublicAuthRequest =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-email") ||
      url.includes("/auth/resend-verification") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/refresh");

    if (status === 401 && !isPublicAuthRequest && !originalRequest._retry) {
      const refreshToken = refreshTokenStore.get();
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const refreshRes = await axios.post(
            `${API_URL.replace(/\/+$/, "")}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
          );
          const newAccessToken = refreshRes.data?.access_token;
          if (newAccessToken) {
            tokenStore.set(newAccessToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axiosClient(originalRequest);
          }
        } catch {
          // Refresh failed; clear session below
        }
      }

      tokenStore.clear();
      refreshTokenStore.clear();
      userStore.clear();
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) => {
  if (error.response) {
    const data = error.response.data;
    if (data?.errors && typeof data.errors === "object") {
      const firstKey = Object.keys(data.errors).at(0);
      const firstVal = firstKey ? data.errors[firstKey] : null;
      const msg = Array.isArray(firstVal) ? firstVal.at(0) : String(firstVal || "");
      if (msg) return msg;
    }
    return (
      data?.message ||
      data?.error ||
      `Request failed with status ${error.response.status}.`
    );
  }

  if (error.request) {
    return "Cannot reach the server. Check that Flask is running and the API URL is correct.";
  }

  return error.message || "An unexpected error occurred.";
};

export default axiosClient;
