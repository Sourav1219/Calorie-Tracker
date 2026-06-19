const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional: Google-only accounts have no password.
    password: { type: String, default: null },
    googleId: { type: String, default: null },
    age: { type: Number, default: null },
    weight: { type: Number, default: null },
    height: { type: Number, default: null },
    gender: { type: String, default: null },
    goal: { type: String, default: null },
    activityLevel: { type: String, default: null },
    isAdmin: { type: Boolean, default: false },
    dailyCalorieGoal: { type: Number, default: 2000 },
    dailyWaterGoalMl: { type: Number, default: 2500 },
    photoUrl: { type: String, default: null },
    pushSubscriptions: { type: [Object], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
