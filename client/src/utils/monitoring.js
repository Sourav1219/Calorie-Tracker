let handlersRegistered = false;

export function reportClientError(error, context = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    message: error?.message || String(error),
    stack: error?.stack || null,
    context,
  };
  console.error("ClientError", payload);
}

export function registerGlobalErrorHandlers() {
  if (handlersRegistered || typeof window === "undefined") return;
  handlersRegistered = true;

  window.addEventListener("error", (event) => {
    reportClientError(event.error || event.message, {
      type: "window.error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, {
      type: "window.unhandledrejection",
    });
  });
}
