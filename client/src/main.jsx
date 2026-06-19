import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import { MealSectionProvider } from "./context/MealSectionContext";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { registerGlobalErrorHandlers } from "./utils/monitoring";
import { registerSW } from "./utils/pushNotifications";
import "./index.css";

registerGlobalErrorHandlers();
registerSW();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
        <UserProvider>
          <MealSectionProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </MealSectionProvider>
          <Toaster
            position="top-center"
            gutter={10}
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--surface-1)",
                color: "var(--text-primary)",
                borderRadius: "16px",
                border: "1px solid var(--border-default)",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: '"DM Sans", sans-serif',
                boxShadow:
                  "0 10px 30px -8px rgba(0,0,0,0.18), 0 2px 8px -2px rgba(0,0,0,0.08)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </UserProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
