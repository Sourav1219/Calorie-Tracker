const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTodayMeals,
  createMeal,
  deleteMeal,
} = require("../controllers/mealController");

// GET /api/meals/test
router.get("/test", (req, res) => {
  res.json({
    message: "Meals route working",
    status: "ok",
  });
});

// GET /api/meals/today
router.get("/today", authMiddleware, getTodayMeals);

// POST /api/meals
router.post("/", authMiddleware, createMeal);

// DELETE /api/meals/:id
router.delete("/:id", authMiddleware, deleteMeal);

module.exports = router;
