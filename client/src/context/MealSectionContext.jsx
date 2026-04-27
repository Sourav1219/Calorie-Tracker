import { createContext, useContext, useState, useEffect } from "react";
import { mealSectionsAPI } from "../utils/api";
import { useUser } from "./UserContext";
import toast from "react-hot-toast";

const MealSectionContext = createContext(null);

export function MealSectionProvider({ children }) {
  const { isLoggedIn } = useUser();
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      fetchSections();
    } else {
      setSections([]);
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  const fetchSections = async () => {
    try {
      setIsLoading(true);
      const res = await mealSectionsAPI.getAll();
      setSections(res.data.sections || []);
    } catch (error) {
      console.error("Failed to fetch meal sections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSection = async (name, icon) => {
    try {
      const res = await mealSectionsAPI.create({ name, icon });
      setSections((prev) => [...prev, res.data.section]);
      return res.data.section;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add section");
      throw error;
    }
  };

  const updateSection = async (id, data) => {
    try {
      setSections((prev) => prev.map((s) => (s._id === id ? { ...s, ...data } : s)));
      await mealSectionsAPI.update(id, data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update section");
      fetchSections(); // rollback
    }
  };

  const removeSection = async (id) => {
    try {
      setSections((prev) => prev.filter((s) => s._id !== id));
      await mealSectionsAPI.remove(id);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete section");
      fetchSections(); // rollback
    }
  };

  const reorderSections = async (newOrderIds) => {
    try {
      // Optimistic update — create new objects to avoid mutating React state
      const newSections = newOrderIds
        .map((id, index) => {
          const found = sections.find(s => s._id === id);
          return found ? { ...found, sortOrder: index } : null;
        })
        .filter(Boolean);
      setSections(newSections);
      
      await mealSectionsAPI.reorder(newOrderIds);
    } catch (error) {
      toast.error("Failed to reorder sections");
      fetchSections(); // rollback
    }
  };

  return (
    <MealSectionContext.Provider value={{ sections, isLoading, addSection, updateSection, removeSection, reorderSections }}>
      {children}
    </MealSectionContext.Provider>
  );
}

export function useMealSections() {
  const context = useContext(MealSectionContext);
  if (!context) {
    throw new Error("useMealSections must be used within a MealSectionProvider");
  }
  return context;
}
