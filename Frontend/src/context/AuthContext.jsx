
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { tokenStore, userStore } from "../api/axiosClient";

const AuthContext = createContext(null);

// Backend URL
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    tokenStore.get() ? userStore.get() : null
  );

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Check authentication when the application loads
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
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Authentication expired. Please log in again.");
        }

        const data = await response.json();
        const currentUser = data.user ?? data;

        if (isMounted) {
          userStore.set(currentUser);
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);

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

  // Login
  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Login failed"
        );
      }

      // Accept either access_token or token
      const token = data.access_token || data.token;

      if (!token) {
        throw new Error("No authentication token returned by the server.");
      }

      const loggedInUser = data.user ?? data;

      // Save authentication details
      tokenStore.set(token);
      userStore.set(loggedInUser);

      setUser(loggedInUser);

      return {
        success: true,
        user: loggedInUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    const token = tokenStore.get();

    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
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

      return roles.includes(user?.role);
    },
    [user]
  );

  // Share authentication data with the application
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

// Custom authentication hook
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
}


