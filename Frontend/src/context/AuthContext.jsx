
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

// Create the authentication context
const AuthContext = createContext(null);

// Backend URL
const API_URL =
  import.meta.env.VITE_API_URL || "";

// Authentication provider
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Check whether a user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // BACKEND CONNECTION:
        // GET /api/auth/me
        // This endpoint should return the currently logged-in user.
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Authentication expired");
        }

        const data = await response.json();

        // Support either { user: {...} } or a direct user object.
        setUser(data.user ?? data);
      } catch (error) {
        console.error("Authentication check failed:", error);

        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      // BACKEND CONNECTION:
      // POST /api/auth/login
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

      // Save the JWT token.
      // Adjust this field if your Flask response uses another name.
      const token =
        data.access_token ||
        data.token;

      if (!token) {
        throw new Error("No authentication token was returned.");
      }

      localStorage.setItem("token", token);

      // Save the logged-in user.
      const loggedInUser = data.user ?? data;

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
  };

  // Logout function
  const logout = async () => {
    const token = localStorage.getItem("token");

    try {
      // BACKEND CONNECTION:
      // POST /api/auth/logout
      // This is optional if your backend does not have a logout endpoint.
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
      localStorage.removeItem("token");
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  // Share authentication information with the application.
  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for accessing authentication
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
}


