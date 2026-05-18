function normalizeError(error) {
  if (!error) {
    return { message: "Unknown error" };
  }

  return {
    message: error.message || String(error),
    stack: error.stack || null,
    name: error.name || "Error",
  };
}

function registerProcessMonitoring(logger) {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
      error: normalizeError(reason),
    });
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
      error: normalizeError(error),
    });
  });
}

module.exports = {
  registerProcessMonitoring,
  normalizeError,
};
