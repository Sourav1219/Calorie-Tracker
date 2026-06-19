process.env.TZ = "Asia/Kolkata";
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { connectToDatabase } = require("./config/database");
const logger = require("./utils/logger");
const requestContext = require("./middleware/requestContext");
const sanitizeRequest = require("./middleware/sanitize");
const { registerProcessMonitoring, normalizeError } = require("./utils/monitoring");
const { apiLimiter } = require("./middleware/rateLimiters");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
registerProcessMonitoring(logger);

// Security headers (HSTS, X-Content-Type-Options, frameguard, etc.) plus a
// Content-Security-Policy tuned for the app: Google Fonts, React inline styles
// + toast-injected styles, and data:/blob: images (avatars, crop preview).
const isProd = process.env.NODE_ENV === "production";

// In production the API runs behind a single PaaS reverse proxy (TLS
// termination / load balancer). Trust exactly one hop so req.ip reflects the
// real client (per-IP rate limiting actually works instead of bucketing every
// user under the proxy's IP) and secure-cookie / req.protocol detection is
// correct. A numeric hop count (not `true`) keeps X-Forwarded-For unspoofable.
if (isProd) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);
}

app.use(
  helmet({
    // Force HTTPS for a year, incl. subdomains, and opt into the browser
    // preload list so HTTPS is enforced even on the very first visit.
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        // Google Identity Services script for "Sign in with Google".
        "script-src": ["'self'", "https://accounts.google.com/gsi/client"],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://accounts.google.com/gsi/style",
        ],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:", "blob:", "https:"],
        // Google sign-in button renders in an iframe + calls the GSI endpoint.
        "connect-src": ["'self'", "https://accounts.google.com/gsi/"],
        "frame-src": ["https://accounts.google.com/gsi/"],
        "worker-src": ["'self'"],
        "manifest-src": ["'self'"],
        "frame-ancestors": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        // Only force HTTPS upgrades in production (dev runs over http).
        "upgrade-insecure-requests": isProd ? [] : null,
      },
    },
    // Allow cross-origin fonts/images to load without COEP friction.
    crossOriginEmbedderPolicy: false,
  })
);

// ✅ CORS here
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://calorie-tracker-eight-dusky.vercel.app",
    "https://pureintake.app",
    "https://www.pureintake.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));
app.use(cookieParser());
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
// Tight 1mb body cap everywhere (reduces large-payload DoS surface, was 50mb);
// only the admin-only bulk-upload endpoints get a larger cap for CSV imports.
const jsonSmall = express.json({ limit: "1mb" });
const jsonBulk = express.json({ limit: "15mb" });
app.use((req, res, next) =>
  req.path.startsWith("/api/food/bulk") ? jsonBulk(req, res, next) : jsonSmall(req, res, next)
);
app.use(express.urlencoded({ limit: "1mb", extended: true }));
// Strip NoSQL operator-injection vectors ($, dotted keys) from all input.
app.use(sanitizeRequest);
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

// ─── Push Notification Heartbeat ──────────────────────────
// Runs every 30 minutes to send time-based push reminders to opted-in users
async function runPushHeartbeat() {
  try {
    const User = require("./models/User");
    const UserActivity = require("./models/UserActivity");
    const DailyLog = require("./models/DailyLog");
    const { sendPushToUser } = require("./utils/pushSender");

    const now = new Date();
    const hour = now.getHours();

    // Only run during waking hours (7 AM – 9 PM)
    if (hour < 7 || hour >= 21) return;

    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Fetch only users who have push subscriptions
    const users = await User.find({ pushSubscriptions: { $exists: true, $not: { $size: 0 } } });

    for (const user of users) {
      try {
        const activity = await UserActivity.findOne({ userId: user._id });
        if (!activity || activity.totalDaysLogged < 2) continue;

        const todayLog = await DailyLog.findOne({ userId: user._id, date: today });
        const goalCal = user.dailyCalorieGoal || 2000;
        const goalWater = user.dailyWaterGoalMl || 2500;
        const currentCal = todayLog?.totalCalories || 0;
        const currentWater = todayLog?.totalWaterMl || 0;
        const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;

        // Water reminder: > 50% deficit during 10 AM – 8 PM, not pushed in last 3h
        const waterDeficit = goalWater - currentWater;
        if (waterDeficit > goalWater * 0.5 && hour >= 10 && hour < 20) {
          const lastWater = activity.lastWaterNotification;
          if (!lastWater || new Date(lastWater).getTime() < threeHoursAgo) {
            const remaining = Math.round(waterDeficit / 100) / 10;
            await sendPushToUser(user, {
              title: "Stay hydrated! 💧",
              body: `You're ${remaining}L away from your daily water goal.`,
              tag: "water_reminder",
              url: "/water",
            });
            activity.lastWaterNotification = now;
            await activity.save();
          }
        }

        // Meal reminders — same logic as smart notifications
        let mealType = null;
        if (hour >= 8 && hour < 11 && currentCal < goalCal * 0.1) mealType = "breakfast";
        else if (hour >= 12 && hour < 15 && currentCal < goalCal * 0.3) mealType = "lunch";
        else if (hour >= 18 && hour < 21 && currentCal < goalCal * 0.6) mealType = "dinner";

        if (mealType) {
          const lastMeal = activity.lastMealNotification;
          if (!lastMeal || new Date(lastMeal).getTime() < fourHoursAgo) {
            await sendPushToUser(user, {
              title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} reminder 🍽️`,
              body: `Don't forget to log your ${mealType}!`,
              tag: `meal_${mealType}`,
              url: "/log",
            });
            activity.lastMealNotification = now;
            await activity.save();
          }
        }

        // Weekly insight — Sundays 6–8 PM
        if (now.getDay() === 0 && hour >= 18 && hour < 20 && activity.weeklyAverageCalories > 0) {
          const avgDiff = activity.weeklyAverageCalories - goalCal;
          const diffPct = Math.abs(Math.round((avgDiff / goalCal) * 100));
          if (Math.abs(avgDiff) > goalCal * 0.1) {
            const lastWeekly = activity.lastStreakNotification; // reuse field as weekly marker
            const oneWeekAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
            if (!lastWeekly || new Date(lastWeekly).getTime() < oneWeekAgo) {
              await sendPushToUser(user, {
                title: "Weekly Summary 📊",
                body: avgDiff > 0
                  ? `You averaged ${diffPct}% above your calorie goal this week.`
                  : `You averaged ${diffPct}% below your calorie goal this week.`,
                tag: "weekly_insight",
                url: "/calendar",
              });
            }
          }
        }
      } catch (userErr) {
        logger.error("Push heartbeat user error", { userId: user._id, error: userErr.message });
      }
    }
  } catch (err) {
    logger.error("Push heartbeat failed", { error: err.message });
  }
}

// ─── Start Server ─────────────────────────────────────────
async function startServer() {
  try {
    // Fail fast on missing critical config so auth can never silently break.
    const requiredEnv = ["JWT_SECRET", "MONGODB_URI"];
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      logger.error("Missing required environment variables", { missing });
      process.exit(1);
    }

    await connectToDatabase();

    app.listen(PORT, () => {
      logger.info("Server started", {
        port: PORT,
        apiBase: `http://localhost:${PORT}/api`,
      });

      // Start push heartbeat — runs once immediately then every 30 minutes
      runPushHeartbeat();
      setInterval(runPushHeartbeat, 30 * 60 * 1000);
    });
  } catch (error) {
    logger.error("Failed to connect to MongoDB", {
      error: normalizeError(error),
    });
    process.exit(1);
  }
}

startServer();
