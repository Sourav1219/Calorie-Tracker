import { useUser } from "../context/UserContext";

/**
 * Custom hook for auth-related actions.
 * Wraps UserContext for convenience.
 */
export default function useAuth() {
  const { user, token, isLoggedIn, isLoading, login, logout, updateUser } = useUser();

  return {
    user,
    token,
    isLoggedIn,
    isLoading,
    login,
    logout,
    updateUser,
  };
}
