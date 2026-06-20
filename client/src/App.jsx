import { useEffect, useLayoutEffect, useRef, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUser } from "./context/UserContext";
import { isProfileComplete } from "./utils/user";
import { foodAPI } from "./utils/api";
import { setCache, hasCache } from "./utils/pageCache";

// Lazy route chunks — each loads on demand when first rendered. They're also
// warmed during browser idle time (see the prefetch effect below) so navigation
// still feels instant, WITHOUT downloading/parsing every route's JS up front on
// the landing screen (which inflated initial bundle size + main-thread work).
const pageImport = {
  Dashboard:       () => import("./pages/Dashboard"),
  MealLog:         () => import("./pages/MealLog"),
  FoodDatabase:    () => import("./pages/FoodDatabase"),
  WaterTracker:    () => import("./pages/WaterTracker"),
  Calendar:        () => import("./pages/Calendar"),
  Profile:         () => import("./pages/Profile"),
  AdminBulkUpload: () => import("./pages/AdminBulkUpload"),
  Login:           () => import("./pages/Login"),
  Register:        () => import("./pages/Register"),
};

const Dashboard       = lazy(pageImport.Dashboard);
const MealLog         = lazy(pageImport.MealLog);
const FoodDatabase    = lazy(pageImport.FoodDatabase);
const WaterTracker    = lazy(pageImport.WaterTracker);
const Calendar        = lazy(pageImport.Calendar);
const Profile         = lazy(pageImport.Profile);
const AdminBulkUpload = lazy(pageImport.AdminBulkUpload);
const Login           = lazy(pageImport.Login);
const Register        = lazy(pageImport.Register);

import ProtectedRoute from "./components/ProtectedRoute";

// The top/bottom nav only render when logged in, so keep them (and their icons)
// out of the initial bundle the public login page downloads.
const Navbar    = lazy(() => import("./components/Navbar"));
const BottomNav = lazy(() => import("./components/BottomNav"));

function App() {
  const { isLoggedIn, isLoading, user } = useUser();
  // A logged-in Google user without body stats still needs onboarding (/register).
  const needsOnboarding = isLoggedIn && !isProfileComplete(user);
  const location = useLocation();
  const contentRef = useRef(null);

  // Hide the top + bottom nav only while actively on the onboarding screen,
  // so they never overlap its form. On every real app page they show as usual.
  const onOnboardingScreen = needsOnboarding && location.pathname === "/register";

  // Reset scroll to the top on every route change (the scroll container is
  // .app-mobile-content, not the window, so window.scrollTo won't work here).
  useLayoutEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Warm route chunks during browser idle time so navigation stays instant,
  // without burdening the landing screen with every page's JS up front. Only
  // the relevant set is prefetched (app pages once logged in, auth pages
  // otherwise; admin only for admins).
  useEffect(() => {
    if (isLoading) return;
    const warm = () => {
      if (isLoggedIn) {
        pageImport.Dashboard();
        pageImport.MealLog();
        pageImport.FoodDatabase();
        pageImport.WaterTracker();
        pageImport.Calendar();
        pageImport.Profile();
        if (user?.role === "admin") pageImport.AdminBulkUpload();
      } else {
        pageImport.Login();
        pageImport.Register();
      }
    };
    const ric = window.requestIdleCallback;
    const handle = ric ? ric(warm, { timeout: 2500 }) : window.setTimeout(warm, 1500);
    return () => {
      if (ric && window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [isLoading, isLoggedIn, user?.role]);

  // Warm the food catalog cache right after login so the "Add food" list opens
  // instantly instead of fetching the whole catalog the first time it's opened.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!hasCache("food:list:all")) {
      foodAPI.search("", null)
        .then((res) => setCache("food:list:all", res.data.results || []))
        .catch(() => {});
    }
    if (!hasCache("food:categories")) {
      foodAPI.getCategories()
        .then((res) => setCache("food:categories", res.data.categories || []))
        .catch(() => {});
    }
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div className="app-mobile-shell">
        <div className="flex flex-col items-center justify-center flex-1" style={{ background: "var(--bg-page)" }}>
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--green-primary)" }} />
          <p className="mt-3 text-sm font-medium" style={{ color: "var(--text-muted)" }}>Loading PureIntake...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-mobile-shell">
      {isLoggedIn && !onOnboardingScreen && (
        <Suspense fallback={null}><Navbar /></Suspense>
      )}

      <main className="app-mobile-content" ref={contentRef}>
        <div key={location.pathname} className="page-transition">
        <Suspense fallback={null}>
        <Routes location={location}>
          {/* Public Routes */}
          <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={isLoggedIn && !needsOnboarding ? <Navigate to="/dashboard" replace /> : <Register />} />

          {/* Protected Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/log" element={<ProtectedRoute><MealLog /></ProtectedRoute>} />
          <Route path="/food-db" element={<ProtectedRoute><FoodDatabase /></ProtectedRoute>} />
          <Route path="/water" element={<ProtectedRoute><WaterTracker /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin/bulk-upload" element={<ProtectedRoute adminOnly><AdminBulkUpload /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
        </div>
      </main>

      {isLoggedIn && !onOnboardingScreen && (
        <Suspense fallback={null}><BottomNav /></Suspense>
      )}
    </div>
  );
}

export default App;
