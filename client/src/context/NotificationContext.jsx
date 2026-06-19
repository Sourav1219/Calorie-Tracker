import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser } from "./UserContext";
import { notificationsAPI } from "../utils/api";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user, isLoading: userLoading } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [hasNew, setHasNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch smart notifications from backend
  const fetchNotifications = useCallback(async () => {
    // Don't fetch if user is not loaded or not logged in
    if (!user || userLoading) {
      setNotifications([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await notificationsAPI.getSmartNotifications();
      const serverNotifications = res.data.notifications || [];
      
      // Merge with localStorage to preserve read status
      const stored = localStorage.getItem(`notifications_${user.id}`);
      let readIds = new Set();
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          readIds = new Set(parsed.filter(n => n.read).map(n => n.id));
        } catch (e) {
          console.error("Failed to parse stored notifications:", e);
        }
      }

      // Mark notifications as read if they were read before
      const mergedNotifications = serverNotifications.map(notif => ({
        ...notif,
        read: readIds.has(notif.id) ? true : notif.read
      }));

      setNotifications(mergedNotifications);
      
      // Save to localStorage
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(mergedNotifications));
    } catch (error) {
      // Silently fail - don't show error to user
      console.error("Failed to fetch notifications:", error);
      // Fallback to empty array on error
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, userLoading]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh notifications every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    let notifType = null;
    setNotifications(prev => {
      const found = prev.find(n => n.id === id);
      notifType = found?.type ?? null;
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      if (user) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });

    if (notifType) {
      notificationsAPI.markShown(notifType).catch(err =>
        console.error("Failed to mark notification as shown:", err)
      );
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });

    // Mark all notification types as shown
    const types = [...new Set(notifications.map(n => n.type))];
    types.forEach(type => {
      notificationsAPI.markShown(type).catch(err => 
        console.error("Failed to mark notification as shown:", err)
      );
    });
  };

  const removeNotification = (id) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      if (user) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const addNotification = useCallback((notif) => {
    const newNotif = {
      id: Date.now().toString(),
      time: new Date().toISOString(),
      read: false,
      ...notif
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      if (user) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
    setHasNew(true);
    setTimeout(() => setHasNew(false), 1000);
  }, [user]);

  // Refresh notifications (can be called manually)
  const refreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      removeNotification,
      addNotification,
      refreshNotifications,
      isLoading,
      hasNew
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
