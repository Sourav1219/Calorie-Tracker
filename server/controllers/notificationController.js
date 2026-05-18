const UserActivity = require("../models/UserActivity");
const DailyLog = require("../models/DailyLog");
const User = require("../models/User");

// Helper: Format date as YYYY-MM-DD
function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: Calculate streak
async function calculateStreak(userId) {
  const logs = await DailyLog.find({ userId })
    .sort({ date: -1 })
    .limit(365)
    .select('date totalCalories');

  if (logs.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if user logged today or yesterday
  const hasLoggedRecently = logs[0].date === today || logs[0].date === yesterday;
  
  if (!hasLoggedRecently) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate streaks
  let expectedDate = new Date(logs[0].date + "T00:00:00");
  
  for (let i = 0; i < logs.length; i++) {
    const logDate = new Date(logs[i].date + "T00:00:00");
    const logDateStr = formatDateKey(logDate);
    const expectedDateStr = formatDateKey(expectedDate);

    if (logDateStr === expectedDateStr && logs[i].totalCalories > 0) {
      tempStreak++;
      if (i === 0 || logs[i-1].date === formatDateKey(new Date(expectedDate.getTime() + 24 * 60 * 60 * 1000))) {
        currentStreak = tempStreak;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (logDateStr !== expectedDateStr) {
      // Gap in streak
      tempStreak = 0;
      break;
    }
  }

  return { currentStreak, longestStreak };
}

// Helper: Calculate weekly averages
async function calculateWeeklyAverages(userId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = formatDateKey(sevenDaysAgo);

  const logs = await DailyLog.find({
    userId,
    date: { $gte: sevenDaysAgoStr }
  });

  if (logs.length === 0) {
    return { calories: 0, water: 0, protein: 0 };
  }

  const totalCalories = logs.reduce((sum, log) => sum + (log.totalCalories || 0), 0);
  const totalWater = logs.reduce((sum, log) => sum + (log.totalWaterMl || 0), 0);
  const totalProtein = logs.reduce((sum, log) => sum + (log.totalProteinG || 0), 0);

  return {
    calories: Math.round(totalCalories / logs.length),
    water: Math.round(totalWater / logs.length),
    protein: Math.round(totalProtein / logs.length)
  };
}

// Update user activity (called after meal/water logging)
exports.updateUserActivity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = formatDateKey(new Date());

    // Get or create activity record
    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
      activity = new UserActivity({ userId });
    }

    // Calculate streak
    const { currentStreak, longestStreak } = await calculateStreak(userId);
    activity.currentStreak = currentStreak;
    activity.longestStreak = Math.max(longestStreak, activity.longestStreak);

    // Update last logged date
    if (activity.lastLoggedDate !== today) {
      activity.totalDaysLogged += 1;
      activity.lastLoggedDate = today;
    }

    // Calculate weekly averages
    const averages = await calculateWeeklyAverages(userId);
    activity.weeklyAverageCalories = averages.calories;
    activity.weeklyAverageWater = averages.water;
    activity.weeklyAverageProtein = averages.protein;

    // Check for achievements
    const user = await User.findById(userId);
    
    // First log achievement
    if (activity.totalDaysLogged === 1 && !activity.achievements.find(a => a.type === 'first_log')) {
      activity.achievements.push({ type: 'first_log', unlockedAt: new Date() });
    }

    // Week streak achievement
    if (currentStreak >= 7 && !activity.achievements.find(a => a.type === 'week_streak')) {
      activity.achievements.push({ type: 'week_streak', unlockedAt: new Date() });
    }

    // Month streak achievement
    if (currentStreak >= 30 && !activity.achievements.find(a => a.type === 'month_streak')) {
      activity.achievements.push({ type: 'month_streak', unlockedAt: new Date() });
    }

    await activity.save();

    res.json({ success: true, activity });
  } catch (error) {
    console.error("Error updating user activity:", error);
    res.status(500).json({ error: "Failed to update activity" });
  }
};

// Get smart notifications based on user data
exports.getSmartNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const activity = await UserActivity.findOne({ userId });
    
    // Get today's log
    const today = formatDateKey(new Date());
    const todayLog = await DailyLog.findOne({ userId, date: today });

    const notifications = [];
    const now = new Date();
    const hour = now.getHours();

    // Don't show notifications for brand new users (less than 2 days logged)
    if (!activity || activity.totalDaysLogged < 2) {
      return res.json({ notifications: [] });
    }

    const goalCal = user?.dailyCalorieGoal || 2000;
    const goalWater = user?.dailyWaterGoalMl || 2500;
    const currentCal = todayLog?.totalCalories || 0;
    const currentWater = todayLog?.totalWaterMl || 0;

    // 1. Streak notifications (only if streak >= 3 and not notified in last 24h)
    if (activity.currentStreak >= 3) {
      const lastStreakNotif = activity.lastStreakNotification;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      if (!lastStreakNotif || new Date(lastStreakNotif).getTime() < oneDayAgo) {
        if (activity.currentStreak === 7) {
          notifications.push({
            id: "streak_7",
            type: "streak",
            title: "7 day streak! 🔥",
            message: "You've logged meals for 7 days in a row. Keep it up!",
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            read: false,
            priority: "high"
          });
        } else if (activity.currentStreak === 30) {
          notifications.push({
            id: "streak_30",
            type: "streak",
            title: "30 day streak! 🎉",
            message: "One month of consistent tracking! You're amazing!",
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            read: false,
            priority: "high"
          });
        } else if (activity.currentStreak % 10 === 0) {
          notifications.push({
            id: `streak_${activity.currentStreak}`,
            type: "streak",
            title: `${activity.currentStreak} day streak! 🔥`,
            message: `You're on fire! ${activity.currentStreak} days of tracking.`,
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            read: false,
            priority: "medium"
          });
        }
      }
    }

    // 2. Water notifications (only if significantly below goal and not notified in last 3h)
    const waterDeficit = goalWater - currentWater;
    if (waterDeficit > goalWater * 0.5 && hour >= 10 && hour < 20) {
      const lastWaterNotif = activity.lastWaterNotification;
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      
      if (!lastWaterNotif || new Date(lastWaterNotif).getTime() < threeHoursAgo) {
        const remainingL = Math.round(waterDeficit / 100) / 10;
        notifications.push({
          id: "water_reminder",
          type: "water",
          title: "Stay hydrated! 💧",
          message: `You're ${remainingL}L away from your daily water goal.`,
          time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          read: false,
          priority: "medium"
        });
      }
    }

    // 3. Meal reminders (only if significantly below expected calories for time of day)
    const expectedCalByHour = {
      9: 0.15,   // Should have ~15% by 9 AM (breakfast)
      13: 0.40,  // Should have ~40% by 1 PM (lunch)
      19: 0.75   // Should have ~75% by 7 PM (dinner)
    };

    let shouldRemindMeal = false;
    let mealType = "";
    
    if (hour >= 8 && hour < 11 && currentCal < goalCal * 0.1) {
      shouldRemindMeal = true;
      mealType = "breakfast";
    } else if (hour >= 12 && hour < 15 && currentCal < goalCal * 0.3) {
      shouldRemindMeal = true;
      mealType = "lunch";
    } else if (hour >= 18 && hour < 21 && currentCal < goalCal * 0.6) {
      shouldRemindMeal = true;
      mealType = "dinner";
    }

    if (shouldRemindMeal) {
      const lastMealNotif = activity.lastMealNotification;
      const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
      
      if (!lastMealNotif || new Date(lastMealNotif).getTime() < fourHoursAgo) {
        notifications.push({
          id: `meal_${mealType}`,
          type: "meal",
          title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} reminder`,
          message: `Don't forget to log your ${mealType}!`,
          time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          read: false,
          priority: "low"
        });
      }
    }

    // 4. Goal reached notification
    if (currentCal >= goalCal && currentCal < goalCal * 1.1) {
      notifications.push({
        id: "goal_reached_today",
        type: "goal",
        title: "Daily goal reached! 🎯",
        message: `You hit your ${goalCal} kcal goal today. Great work!`,
        time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        read: false,
        priority: "high"
      });
    }

    // 5. Weekly insights (only on Sundays)
    if (now.getDay() === 0 && hour >= 18 && activity.weeklyAverageCalories > 0) {
      const avgDiff = activity.weeklyAverageCalories - goalCal;
      const diffPercent = Math.abs(Math.round((avgDiff / goalCal) * 100));
      
      if (Math.abs(avgDiff) > goalCal * 0.1) {
        notifications.push({
          id: "weekly_insight",
          type: "summary",
          title: "Weekly Summary 📊",
          message: avgDiff > 0 
            ? `You averaged ${diffPercent}% above your goal this week.`
            : `You averaged ${diffPercent}% below your goal this week.`,
          time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          read: false,
          priority: "medium"
        });
      }
    }

    // Sort by priority and time
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    notifications.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.time) - new Date(a.time);
    });

    res.json({ notifications });
  } catch (error) {
    console.error("Error generating notifications:", error);
    res.status(500).json({ error: "Failed to generate notifications" });
  }
};

// Mark notification as shown (update last notification time)
exports.markNotificationShown = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.body; // 'water', 'meal', 'streak'

    const activity = await UserActivity.findOne({ userId });
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    if (type === 'water') {
      activity.lastWaterNotification = new Date();
    } else if (type === 'meal') {
      activity.lastMealNotification = new Date();
    } else if (type === 'streak') {
      activity.lastStreakNotification = new Date();
    }

    await activity.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification:", error);
    res.status(500).json({ error: "Failed to mark notification" });
  }
};
