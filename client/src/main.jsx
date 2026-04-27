import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import { MealSectionProvider } from "./context/MealSectionContext";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <UserProvider>
          <MealSectionProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </MealSectionProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#ffffff",
                color: "#111827",
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "14px",
                fontFamily: '"DM Sans", sans-serif',
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </UserProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('ServiceWorker registration failed:', error);
    });
  });
}
