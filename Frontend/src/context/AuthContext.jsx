import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { tokenStore, userStore } from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Read from localStorage once, so the user stays logged in after a refresh.
  const [user, setUser] = useState(() => (tokenStore.get() ? userStore.get() : null));

  // Call this after a successful login API response.
  const login = useCallback(({ token, user: loggedInUser }) => {
    tokenStore.set(token);
    userStore.set(loggedInUser);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    userStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
      hasRole: (roles) => !roles?.length || roles.includes(user?.role),
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}