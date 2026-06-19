import { useEffect, useLayoutEffect, useRef, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUser } from "./context/UserContext";
import { isProfileComplete } from "./utils/user";
import { foodAPI } from "./utils/api";
import { setCache, hasCache } from "./utils/pageCache";

// Start fetching all page chunks immediately — they're cached by the time
// the user navigates, so transitions feel instant (no spinner).
const dashboardChunk    = import("./pages/Dashboard");
const mealLogChunk      = import("./pages/MealLog");
const foodDbChunk       = import("./pages/FoodDatabase");
const waterChunk        = import("./pages/WaterTracker");
const calendarChunk     = import("./pages/Calendar");
const profileChunk      = import("./pages/Profile");
const adminChunk        = import("./pages/AdminBulkUpload");
const loginChunk        = import("./pages/Login");
const registerChunk     = import("./pages/Register");

const Dashboard       = lazy(() => dashboardChunk);
const MealLog         = lazy(() => mealLogChunk);
const FoodDatabase    = lazy(() => foodDbChunk);
const WaterTracker    = lazy(() => waterChunk);
const Calendar        = lazy(() => calendarChunk);
const Profile         = lazy(() => profileChunk);
const AdminBulkUpload = lazy(() => adminChunk);
const Login           = lazy(() => loginChunk);
const Register        = lazy(() => registerChunk);

import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";

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
      {isLoggedIn && !onOnboardingScreen && <Navbar />}

      <div className="app-mobile-content" ref={contentRef}>
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
      </div>

      {isLoggedIn && !onOnboardingScreen && <BottomNav />}
    </div>
  );
}

export default App;
