import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to get local date in YYYY-MM-DD format
export const getLocalDateKey = (date = new Date()) => {
  const d = new Date(date);
  // Force Asia/Kolkata (IST)
  const istStr = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istStr);
  
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const day = String(istDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Request interceptor — attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response && error.request) {
      toast.error("Check your internet connection");
    }

    if (error.response && error.response.status === 401) {
      // Clear stored credentials from both storages
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      // Redirect to login (if not already there)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login?expired=true";
      }
    }
    
    // Default API error toast messages
    if (error.response && error.response.status !== 401) {
       const message = error.response.data?.error || "Operation failed";
       if (error.response.status >= 500) {
         toast.error(message);
       }
    }
    return Promise.reject(error);
  }
);

const searchCache = new Map();

export const foodAPI = {
  search: async (q = "", category = null) => {
    const key = `${q}|${category || ""}`;
    if (searchCache.has(key)) {
      return Promise.resolve({ data: searchCache.get(key) });
    }
    const params = { q };
    if (category) params.category = category;
    const res = await api.get("/food/search", { params });
    searchCache.set(key, res.data);
    return res;
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
  updateProfile: (payload) => api.patch("/auth/me", payload),
};

export const mealSectionsAPI = {
  getAll: () => api.get("/meal-sections"),
  create: (data) => api.post("/meal-sections", data),
  update: (id, data) => api.patch(`/meal-sections/${id}`, data),
  remove: (id) => api.delete(`/meal-sections/${id}`),
  reorder: (orderIds) => api.patch("/meal-sections/reorder", { orderIds }),
};

export default api;
