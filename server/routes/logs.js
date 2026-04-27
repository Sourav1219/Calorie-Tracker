const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTodayLog,
  getMonthlyLogs,
  getLogByDate,
  resetTodayLog,
} = require("../controllers/logController");

// GET /api/logs/test
router.get("/test", (req, res) => {
  res.json({
    message: "Logs route working",
    status: "ok",
  });
});

// GET /api/logs/today
router.get("/today", authMiddleware, getTodayLog);

// DELETE /api/logs/today
router.delete("/today", authMiddleware, resetTodayLog);

// GET /api/logs/month
router.get("/month", authMiddleware, getMonthlyLogs);

// GET /api/logs/:date
router.get("/:date", authMiddleware, getLogByDate);

module.exports = router;
