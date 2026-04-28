const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectToDatabase } = require("./config/database");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/water", waterRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/meal-sections", mealSectionRoutes);

// ─── Serve Frontend in Production ──────────────────────────
const path = require("path");
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, "../client/dist")));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
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
  console.error("❌ Error:", err.message);
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────
async function startServer() {
  try {
    await connectToDatabase();

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`✅ MongoDB connected successfully\n`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
