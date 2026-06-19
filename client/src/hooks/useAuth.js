import { useUser } from "../context/UserContext";

/**
 * Custom hook for auth-related actions.
 * Wraps UserContext for convenience.
 */
export default function useAuth() {
  const { user, isLoggedIn, isLoading, login, logout, updateUser } = useUser();

  return {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    updateUser,
  };
}
