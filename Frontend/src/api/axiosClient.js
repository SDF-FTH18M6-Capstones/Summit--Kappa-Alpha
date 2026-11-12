import axios from "axios";

// Backend URL comes from .env (VITE_API_URL=http://localhost:5000/api).
// Falls back to the local Flask server if the variable is not set.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

const TOKEN_KEY = "summit_access_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Attach the JWT to every request when the user is logged in.
axiosClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token is missing or expired, clear it and send the user to login.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginCall = error.config?.url?.includes("/auth/login");
    if (status === 401 && !isLoginCall) {
      tokenStore.clear();
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

// Turn any API error into one readable message for the UI.
export const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  (error.request ? "Cannot reach the server. Check your connection." : error.message);

export default axiosClient;