import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
  headers: {
    "Content-Type": "application/json",
  },
  // Send/receive the httpOnly auth cookie on every request.
  withCredentials: true,
});

// Date key in YYYY-MM-DD. Pinned to Asia/Kolkata so the client's notion of
// "today" matches the server's day boundary (streaks, activity, notifications
// are all computed in IST). en-CA formats as YYYY-MM-DD.
export const getLocalDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));

// Auth now travels in an httpOnly cookie (withCredentials), so there's no
// token to attach from JS. No request interceptor needed.

// Response interceptor — handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if this is a notification API call (don't show toast for these)
    const isNotificationAPI = error.config?.url?.includes('/notifications');

    if (!error.response && error.request && !isNotificationAPI) {
      toast.error("Check your internet connection");
    }

    if (error.response && error.response.status === 401) {
      // Session expired/invalid — drop the cached profile and bounce to login.
      // (The cookie itself is httpOnly; the server clears it on logout.)
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");

      // Avoid a redirect loop on the auth-check call itself.
      const isAuthCheck = error.config?.url?.includes("/auth/me");
      if (!isAuthCheck && window.location.pathname !== "/login") {
        window.location.href = "/login?expired=true";
      }
    }
    
    // Default API error toast messages (skip for notification API)
    if (error.response && error.response.status !== 401 && !isNotificationAPI) {
       const message = error.response.data?.error || "Operation failed";
       if (error.response.status >= 500) {
         toast.error(message);
       }
    }
    return Promise.reject(error);
  }
);

export const foodAPI = {
  search: async (q = "", category = null) => {
    const params = { q };
    if (category) params.category = category;
    return api.get("/food/search", { params });
  },
  getById: (id) => api.get(`/food/${id}`),
  create: (foodData) => api.post("/food", foodData),
  getCategories: () => api.get("/food/categories"),
};

export const mealsAPI = {
  getToday: (date = getLocalDateKey()) =>
    api.get("/meals/today", { params: { date } }),
  create: (mealData) => {
    // Ensure a date is always sent to avoid server-side timezone shifts
    const data = { date: getLocalDateKey(), ...mealData };
    return api.post("/meals", data);
  },
  remove: (id) => api.delete(`/meals/${id}`),
};

export const waterAPI = {
  getToday: (date = getLocalDateKey()) =>
    api.get("/water/today", { params: { date } }),
  create: (waterData) => {
    const data = { date: getLocalDateKey(), ...waterData };
    return api.post("/water", data);
  },
  remove: (id) => api.delete(`/water/${id}`),
};

export const logsAPI = {
  getToday: (date = getLocalDateKey()) =>
    api.get("/logs/today", { params: { date } }),
  resetToday: (date = getLocalDateKey()) =>
    api.delete("/logs/today", { params: { date } }),
  getMonth: (month, year) => api.get("/logs/month", { params: { month, year } }),
  getByDate: (date) => api.get(`/logs/${date}`),
};

export const adminAPI = {
  analyzeBulkUploadFoods: (items, format = "mixed") =>
    api.post("/food/bulk/analyze", { items, format }),
  bulkUploadFoods: (items, format = "mixed") => api.post("/food/bulk", { items, format }),
  getBulkUploadHistory: () => api.get("/food/bulk/history"),
};

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (payload) => api.post("/auth/register", payload),
  googleLogin: (credential) => api.post("/auth/google", { credential }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  updateProfile: (payload) => api.patch("/auth/me", payload),
};

export const mealSectionsAPI = {
  getAll: () => api.get("/meal-sections"),
  create: (data) => api.post("/meal-sections", data),
  update: (id, data) => api.patch(`/meal-sections/${id}`, data),
  remove: (id) => api.delete(`/meal-sections/${id}`),
  reorder: (orderIds) => api.patch("/meal-sections/reorder", { orderIds }),
};

export const notificationsAPI = {
  getSmartNotifications: () => api.get("/notifications/smart"),
  updateActivity: () => api.post("/notifications/update-activity"),
  markShown: (type) => api.post("/notifications/mark-shown", { type }),
  getVapidPublicKey: () => api.get("/notifications/push/vapid-key"),
  subscribePush: (subscription) => api.post("/notifications/push/subscribe", subscription),
  unsubscribePush: (endpoint) => api.post("/notifications/push/unsubscribe", { endpoint }),
};

export default api;
