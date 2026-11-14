import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import {
  tokenStore,
  userStore,
} from "../api/axiosClient";

import axiosClient from "../api/axiosClient";

const AuthContext = createContext(null);

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    tokenStore.get() ? userStore.get() : null
  );

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const token = tokenStore.get();

      if (!token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await axiosClient.get("/auth/me");

        const data = response.data;
        const currentUser =
          data.user ?? data.data?.user ?? data;

        if (isMounted) {
          userStore.set(currentUser);
          setUser(currentUser);
        }
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error.response?.data || error.message
        );

        tokenStore.clear();
        userStore.clear();

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await axiosClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const data = response.data;

      const token = data.access_token || data.token;

      if (!token) {
        throw new Error(
          "The backend did not return an authentication token."
        );
      }

      const loggedInUser =
        data.user ?? data.data?.user;

      if (!loggedInUser) {
        throw new Error(
          "The backend did not return user details."
        );
      }

      tokenStore.set(token);
      userStore.set(loggedInUser);

      setUser(loggedInUser);

      return {
        success: true,
        user: loggedInUser,
      };
    } catch (error) {
      console.error(
        "Login failed:",
        error.response?.data || error.message
      );

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Unable to log in.",
      };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      if (tokenStore.get()) {
        await axiosClient.post("/auth/logout");
      }
    } catch (error) {
      console.error(
        "Logout request failed:",
        error.response?.data || error.message
      );
    } finally {
      tokenStore.clear();
      userStore.clear();

      setUser(null);

      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Check user roles
  const hasRole = useCallback(
    (roles) => {
      if (!roles?.length) return true;

      const userRole = normalizeRole(
        user?.role ||
        user?.role_name ||
        user?.user?.role ||
        user?.membership?.role
      );

      return roles.some(
        (role) => normalizeRole(role) === userRole
      );
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user),
      hasRole,
    }),
    [user, loading, login, logout, hasRole]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
}



