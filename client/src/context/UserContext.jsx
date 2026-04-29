import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const UserContext = createContext(null);

/* ─── Storage helpers ────────────────────────────────────── */
const TOKEN_KEY = "token";
const USER_KEY = "user";

/**
 * Try to read a value from localStorage first, then sessionStorage.
 * This lets us transparently restore sessions regardless of where the
 * token was originally persisted (remember-me vs session-only).
 */
function getStored(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

/** Remove a key from both storages so logout is always clean. */
function removeStored(key) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoggedIn = !!user && !!token;

  // Restore session on app load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = getStored(TOKEN_KEY);
        const savedUser = getStored(USER_KEY);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));

          // Verify token is still valid
          try {
            const res = await api.get("/auth/me");
            if (res.data.user) {
              setUser(res.data.user);
              // Persist refreshed user data to whichever storage has the token
              const storage = localStorage.getItem(TOKEN_KEY)
                ? localStorage
                : sessionStorage;
              storage.setItem(USER_KEY, JSON.stringify(res.data.user));
            }
          } catch {
            // Token expired or invalid — clear session
            removeStored(TOKEN_KEY);
            removeStored(USER_KEY);
            setUser(null);
            setToken(null);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Persist user session.
   * @param {object} userData - User profile object
   * @param {string} jwtToken - JWT token string
   * @param {boolean} [rememberMe=true] - If true, persist in localStorage;
   *   if false, use sessionStorage (cleared when browser is closed).
   */
  const login = (userData, jwtToken, rememberMe = true) => {
    setUser(userData);
    setToken(jwtToken);

    const storage = rememberMe ? localStorage : sessionStorage;
    // Clear the other storage to avoid stale data
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem(TOKEN_KEY);
    otherStorage.removeItem(USER_KEY);

    storage.setItem(TOKEN_KEY, jwtToken);
    storage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    removeStored(TOKEN_KEY);
    removeStored(USER_KEY);

    // Redirect to login page
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    // Update whichever storage currently holds the data
    const storage = localStorage.getItem(TOKEN_KEY)
      ? localStorage
      : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  return (
    <UserContext.Provider value={{ user, token, isLoggedIn, isLoading, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export default UserContext;
