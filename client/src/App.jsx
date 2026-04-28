import { Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "./context/UserContext";

import Dashboard from "./pages/Dashboard";
import MealLog from "./pages/MealLog";
import FoodDatabase from "./pages/FoodDatabase";
import WaterTracker from "./pages/WaterTracker";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";
import AdminBulkUpload from "./pages/AdminBulkUpload";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const { isLoggedIn, isLoading } = useUser();

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
      {isLoggedIn && <Navbar />}

      <div className={`app-mobile-content ${isLoggedIn ? 'pt-14 pb-16' : ''}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Register />} />

          {/* Protected Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/log" element={<ProtectedRoute><MealLog /></ProtectedRoute>} />
          <Route path="/food-db" element={<ProtectedRoute><FoodDatabase /></ProtectedRoute>} />
          <Route path="/water" element={<ProtectedRoute><WaterTracker /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin/bulk-upload" element={<ProtectedRoute><AdminBulkUpload /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>

      {isLoggedIn && <BottomNav />}
    </div>
  );
}

export default App;
