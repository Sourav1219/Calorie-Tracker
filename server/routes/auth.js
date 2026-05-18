const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiters");
const { register, login, getMe, updateProfile } = require("../controllers/authController");

// ─── POST /api/auth/register ─────────────────────────────
router.post("/register", authLimiter, register);

// ─── POST /api/auth/login ─────────────────────────────────
router.post("/login", authLimiter, login);

// ─── GET /api/auth/me (protected) ────────────────────────
router.get("/me", authMiddleware, getMe);

// ─── PATCH /api/auth/me (protected) ──────────────────────
router.patch("/me", authMiddleware, updateProfile);

// ─── PUT /api/auth/profile (protected) ───────────────────
router.put("/profile", authMiddleware, updateProfile);

// GET /api/auth/test
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working", status: "ok" });
});

module.exports = router;
