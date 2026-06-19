const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: "User",
    required: true,
    index: true
  },
  // Tracking metrics
  totalDaysLogged: {
    type: Number,
    default: 0
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastLoggedDate: {
    type: String, // YYYY-MM-DD format
    default: null
  },
  // Weekly averages
  weeklyAverageCalories: {
    type: Number,
    default: 0
  },
  weeklyAverageWater: {
    type: Number,
    default: 0
  },
  weeklyAverageProtein: {
    type: Number,
    default: 0
  },
  // Notification tracking
  lastWaterNotification: {
    type: Date,
    default: null
  },
  lastMealNotification: {
    type: Date,
    default: null
  },
  lastStreakNotification: {
    type: Date,
    default: null
  },
  lastGoalPushSent: {
    type: Date,
    default: null
  },
  // Achievements
  achievements: [{
    type: {
      type: String,
      enum: ['first_log', 'week_streak', 'month_streak', 'goal_reached_10', 'goal_reached_30', 'water_champion']
    },
    unlockedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
userActivitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("UserActivity", userActivitySchema);
