const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const mealSectionController = require("../controllers/mealSectionController");

router.use(authMiddleware);

router.get("/", mealSectionController.getSections);
router.post("/", mealSectionController.createSection);
router.patch("/reorder", mealSectionController.reorderSections);
router.patch("/:id", mealSectionController.updateSection);
router.delete("/:id", mealSectionController.deleteSection);

module.exports = router;
