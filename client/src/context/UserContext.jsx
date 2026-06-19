import { createContext, useContext, useState, useEffect } from "react";
import api, { authAPI } from "../utils/api";

const UserContext = createContext(null);

/* ─── Storage helpers ────────────────────────────────────── */
// NOTE: the auth token is NOT stored here — it lives in an httpOnly cookie
// that JavaScript can't read (protects against XSS token theft). We only
// cache the non-sensitive user profile so the UI can render instantly on load.
const USER_KEY = "user";

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeUser(userData, rememberMe = true) {
  const storage = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  other.removeItem(USER_KEY);
  storage.setItem(USER_KEY, JSON.stringify(userData));
}

function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoggedIn = !!user;

  // Restore session on app load — the cookie is sent automatically.
  useEffect(() => {
    const restoreSession = async () => {
      // Optimistically render the cached profile (if any) for an instant UI.
      const cached = getStoredUser();
      if (cached) setUser(cached);

      try {
        const res = await api.get("/auth/me");
        if (res.data.user) {
          setUser(res.data.user);
          // Refresh the cache wherever it already lives (default localStorage).
          const rememberMe = !!localStorage.getItem(USER_KEY) || !cached;
          storeUser(res.data.user, rememberMe);
        }
      } catch {
        // No valid cookie → not logged in. Clear any stale cached profile.
        clearStoredUser();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Persist the session after a successful login/register.
   * The server has already set the httpOnly auth cookie; here we only
   * cache the profile for instant rendering.
   * @param {object} userData - User profile object
   * @param {boolean} [rememberMe=true] - localStorage (persist) vs sessionStorage.
   */
  const login = (userData, rememberMe = true) => {
    setUser(userData);
    storeUser(userData, rememberMe);
  };

  const logout = async () => {
    try {
      await authAPI.logout(); // clears the httpOnly cookie server-side
    } catch {
      // Even if the request fails, clear local state.
    }
    setUser(null);
    clearStoredUser();

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    // Keep the cache in whichever storage currently holds it.
    const rememberMe = !!localStorage.getItem(USER_KEY);
    storeUser(newUser, rememberMe);
  };

  return (
    <UserContext.Provider value={{ user, isLoggedIn, isLoading, login, logout, updateUser }}>
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
