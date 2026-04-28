const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTodayWater,
  createWaterEntry,
  deleteWaterEntry,
} = require("../controllers/waterController");

// GET /api/water/test
router.get("/test", (req, res) => {
  res.json({
    message: "Water route working",
    status: "ok",
  });
});

// GET /api/water/today
router.get("/today", authMiddleware, getTodayWater);

// POST /api/water
router.post("/", authMiddleware, createWaterEntry);

// DELETE /api/water/:id
router.delete("/:id", authMiddleware, deleteWaterEntry);

module.exports = router;
