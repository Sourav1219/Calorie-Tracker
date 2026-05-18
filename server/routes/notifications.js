const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// Get smart notifications based on user activity
router.get("/smart", authMiddleware, notificationController.getSmartNotifications);

// Update user activity (called after logging meals/water)
router.post("/update-activity", authMiddleware, notificationController.updateUserActivity);

// Mark notification as shown
router.post("/mark-shown", authMiddleware, notificationController.markNotificationShown);

module.exports = router;
