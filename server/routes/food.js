const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { publicFoodCache } = require("../middleware/cache");
const {
  searchFood,
  getFoodById,
  createFood,
  analyzeBulkFoods,
  bulkCreateFoods,
  getBulkUploadHistory,
  getCategories,
} = require("../controllers/foodController");

// GET /api/food/test
router.get("/test", (req, res) => {
  res.json({ message: "Food route working", status: "ok" });
});

// GET /api/food/search?q=...&category=...
router.get("/search", searchFood);

// GET /api/food/categories
router.get("/categories", getCategories);

// POST /api/food/bulk/analyze  (admin only)
router.post("/bulk/analyze", authMiddleware, adminMiddleware, analyzeBulkFoods);

// GET /api/food/bulk/history  (admin only)
router.get("/bulk/history", authMiddleware, adminMiddleware, getBulkUploadHistory);

// POST /api/food/bulk  (admin only)
router.post("/bulk", authMiddleware, adminMiddleware, bulkCreateFoods);

// GET /api/food/:id
router.get("/:id", getFoodById);

// POST /api/food  (protected)
router.post("/", authMiddleware, createFood);

module.exports = router;
