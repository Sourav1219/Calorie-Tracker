import React from "react";
import { reportClientError } from "../utils/monitoring";

/**
 * Global Error Boundary — catches any unhandled React render error
 * and shows a recovery UI instead of a blank white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportClientError(error, {
      type: "react.error-boundary",
      componentStack: errorInfo?.componentStack || null,
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f9fafb",
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              fontSize: "28px",
            }}
          >
            ⚠️
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              marginBottom: "24px",
              textAlign: "center",
              maxWidth: "360px",
            }}
          >
            An unexpected error occurred. Your data is safe — try reloading the page.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                background: "#22c55e",
                color: "#fff",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
          <p
            style={{
              marginTop: "14px",
              fontSize: "12px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            If this keeps happening, please share a screenshot with support.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
