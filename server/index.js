process.env.TZ = "Asia/Kolkata";
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { connectToDatabase } = require("./config/database");
const logger = require("./utils/logger");
const requestContext = require("./middleware/requestContext");
const { registerProcessMonitoring, normalizeError } = require("./utils/monitoring");
const { apiLimiter } = require("./middleware/rateLimiters");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
registerProcessMonitoring(logger);

// ✅ CORS here
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://calorie-tracker-eight-dusky.vercel.app",
    "https://www.pureintake.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));
app.use(requestContext);
app.use(
  morgan(":method :url :status :response-time ms", {
    stream: {
      write: (line) => {
        logger.info("HTTP request", { request: line.trimEnd() });
      },
    },
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api", apiLimiter);

// ─── Health Check ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "PureIntake API is running 🥗",
    version: "1.0.0",
    status: "ok",
  });
});

// ─── Routes ───────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const foodRoutes = require("./routes/food");
const mealRoutes = require("./routes/meals");
const waterRoutes = require("./routes/water");
const logRoutes = require("./routes/logs");
const mealSectionRoutes = require("./routes/mealSections");
const notificationRoutes = require("./routes/notifications");

app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/water", waterRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/meal-sections", mealSectionRoutes);
app.use("/api/notifications", notificationRoutes);

// ─── Serve Frontend (if deployed together) ──────────────────
const path = require("path");
const fs = require("fs");
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "../client/dist");
  if (fs.existsSync(clientBuildPath)) {
    // Serve static files from the React app
    app.use(express.static(clientBuildPath));

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });
  }
}

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Unhandled API error", {
    requestId: req.id,
    path: req.originalUrl,
    method: req.method,
    error: normalizeError(err),
  });

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    requestId: req.id,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────
async function startServer() {
  try {
    await connectToDatabase();

    app.listen(PORT, () => {
      logger.info("Server started", {
        port: PORT,
        apiBase: `http://localhost:${PORT}/api`,
      });
    });
  } catch (error) {
    logger.error("Failed to connect to MongoDB", {
      error: normalizeError(error),
    });
    process.exit(1);
  }
}

startServer();
