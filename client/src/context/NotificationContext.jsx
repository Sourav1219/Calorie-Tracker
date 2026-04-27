import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser } from "./UserContext";
import { logsAPI } from "../utils/api";

const NotificationContext = createContext();

const generateSmartNotifications = (user, dailyLog) => {
  if (!user) return [];

  const now = new Date();
  
  // Get hours in IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  const hour = istTime.getHours();

  const generated = [];
  const log = dailyLog || { totalCalories: 0, totalWaterMl: 0 };
  const goalCal = user?.dailyCalorieGoal || 2000;
  const goalWater = user?.dailyWaterGoalMl || 3000;

  // Goal Reached
  if (log.totalCalories > 0 && log.totalCalories >= goalCal) {
    generated.push({
      id: "goal_reached", type: "goal", title: "Daily goal reached!",
      message: `You hit your ${goalCal} kcal goal today. Great work!`,
      time: new Date(Date.now() - 5 * 60000).toISOString(), read: false
    });
  }

  // Meal Reminders based on log
  if (hour >= 8 && hour < 11) {
    if (log.totalCalories === 0) {
      generated.push({
        id: "meal_breakfast", type: "meal", title: "Breakfast reminder", 
        message: "Start your day right! Log your breakfast.", 
        time: new Date(Date.now() - 5 * 60000).toISOString(), read: false
      });
    }
  } else if (hour >= 13 && hour < 16) {
    if (log.totalCalories < goalCal * 0.25) {
      generated.push({
        id: "meal_lunch", type: "meal", title: "Lunch reminder", 
        message: "It's lunchtime! Don't forget to log your meal.", 
        time: new Date(Date.now() - 5 * 60000).toISOString(), read: false
      });
    }
  } else if (hour >= 19 && hour < 22) {
    if (log.totalCalories < goalCal * 0.6) {
      generated.push({
        id: "meal_dinner", type: "meal", title: "Dinner reminder", 
        message: "Time for dinner! Keep track of your calories.", 
        time: new Date(Date.now() - 5 * 60000).toISOString(), read: false
      });
    }
  }

  // Water Reminder (6 AM - 6 PM IST)
  if (hour >= 6 && hour < 18) {
    if (log.totalWaterMl < goalWater) {
      const remainingL = Math.round((goalWater - log.totalWaterMl) / 100) / 10;
      generated.push({
        id: "water_rem", type: "water", title: "Stay hydrated!",
        message: `You're ${remainingL}L away from your daily water goal.`,
        time: new Date(Date.now() - 60 * 60000).toISOString(), read: false
      });
    }
  }

  // Generic Streak
  generated.push({
    id: "streak_7", type: "streak", title: "7 day streak! 🔥",
    message: "You've logged meals for 7 days in a row. Keep it up!",
    time: new Date(Date.now() - 3 * 60 * 60000).toISOString(), read: true
  });

  return generated;
};

export function NotificationProvider({ children }) {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [hasNew, setHasNew] = useState(false);

  // Load from localStorage or API
  useEffect(() => {
    if (!user) return;

    const initializeNotifications = async () => {
      let logData = null;
      try {
        const res = await logsAPI.getToday();
        logData = res.data?.log || null;
      } catch (err) {
        console.error("Could not fetch log for notifications", err);
      }

      const stored = localStorage.getItem(`notifications_${user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          let valid = parsed.filter(n => new Date(n.time).getTime() > sevenDaysAgo);
          
          // Merge dynamic notifications if they don't already exist
          const smartNotifs = generateSmartNotifications(user, logData);
          const newNotifs = smartNotifs.filter(sn => !valid.find(v => v.id === sn.id));
          
          if (newNotifs.length > 0) {
            valid = [...newNotifs, ...valid];
          }
          setNotifications(valid);
        } catch (e) {
          setNotifications(generateSmartNotifications(user, logData));
        }
      } else {
        setNotifications(generateSmartNotifications(user, logData));
      }
    };

    initializeNotifications();
  }, [user]);

  // Save to localStorage
  useEffect(() => {
    if (!user || notifications.length === 0) return;
    const toSave = notifications.slice(0, 50);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(toSave));
  }, [notifications, user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = useCallback((notif) => {
    const newNotif = {
      id: Date.now().toString(),
      time: new Date().toISOString(),
      read: false,
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev]);
    setHasNew(true);
    setTimeout(() => setHasNew(false), 1000);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      removeNotification,
      addNotification,
      hasNew
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
