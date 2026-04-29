import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { Search, Trash2, Edit2, UtensilsCrossed } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { mealsAPI } from "../utils/api";
import { useMealSections } from "../context/MealSectionContext";
import MealSectionSheet from "../components/MealSectionSheet";
import MealIcon from "../components/MealIcon";

export default function MealLog() {
  const [searchParams] = useSearchParams();
  const { sections } = useMealSections();
  const [activeTab, setActiveTab] = useState(searchParams.get("meal") || "");
  const [meals, setMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigate = useNavigate();

  // Make sure activeTab is valid, or fallback to the first section
  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s._id === activeTab)) {
      setActiveTab(sections[0]._id);
    }
  }, [sections, activeTab]);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        setIsLoading(true);
        const res = await mealsAPI.getToday();
        setMeals(res.data.meals || []);
      } catch (error) {
        toast.error(error.response?.data?.error || "Failed to load meals");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeals();
  }, []);

  const filteredMeals = useMemo(() => {
    // If a meal has a sectionId (stored in mealType field in db) that doesn't exist, it's considered deleted.
    // If the currently active tab is not found (which shouldn't happen because of the effect), handle it gracefully.
    return meals.filter((meal) => meal.mealType === activeTab);
  }, [activeTab, meals]);

  const totalCalories = filteredMeals.reduce((sum, meal) => sum + meal.calories, 0);

  const handleDelete = useCallback(async (mealId) => {
    // Optimistic: remove from UI immediately
    const previousMeals = meals;
    setMeals((current) => current.filter((meal) => meal.id !== mealId));
    toast.success("Meal removed");

    try {
      await mealsAPI.remove(mealId);
    } catch (error) {
      // Rollback on failure
      setMeals(previousMeals);
      toast.error(error.response?.data?.error || "Failed to delete meal");
    }
  }, [meals]);

  const activeSectionName = sections.find(s => s._id === activeTab)?.name || "Section";

  return (
    <>
      <div className="page-container animate-fade-in" style={{ background: "var(--bg-page)" }}>
      <div className="flex items-center gap-2.5 mb-5 mt-1">
        <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9 meal-log-header-icon">
          {/* Plate Base */}
          <circle cx="20" cy="20" r="13" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="9" fill="#FFFFFF" />
          
          {/* Inner Food - A pulsing green health heart */}
          <path d="M20 25.5 C20 25.5 14.5 21 14.5 17 C14.5 14.5 16.5 12.5 19 12.5 C20 12.5 20.5 13.5 20.5 13.5 C20.5 13.5 21 12.5 22 12.5 C24.5 12.5 26.5 14.5 26.5 17 C26.5 21 20 25.5 20 25.5 Z" fill="#22C55E" className="plate-heart" />
          
          {/* Fork (Left) */}
          <g className="dancing-fork">
            <path d="M8 12 L8 20 Q8 22 10 24 L10 32" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="6" y1="12" x2="6" y2="16" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round"/>
            <line x1="10" y1="12" x2="10" y2="16" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round"/>
          </g>
          
          {/* Knife (Right) */}
          <g className="dancing-knife">
            <line x1="32" y1="12" x2="32" y2="32" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M32 12 Q35 16 35 20 L32 20 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
          </g>

          {/* Sparkles */}
          <circle cx="26" cy="10" r="1.5" fill="#4ADE80" className="plate-sparkle-1"/>
          <circle cx="14" cy="8" r="1" fill="#FBBF24" className="plate-sparkle-2"/>
        </svg>
        <h1 className="text-[22px] font-extrabold" style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Meal Log
        </h1>
      </div>

      {/* Meal Type Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar items-center">
        {sections.map((section) => (
          <button
            key={section._id}
            onClick={() => setActiveTab(section._id)}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-200 w-[110px] flex-shrink-0"
            style={{
              background: activeTab === section._id ? "var(--green-primary)" : "var(--surface-1)",
              color: activeTab === section._id ? "var(--text-on-green)" : "var(--text-muted)",
              border: activeTab === section._id ? "1px solid transparent" : "1px solid var(--border-default)",
              boxShadow: activeTab === section._id ? "0 2px 8px rgba(34,197,94,0.25)" : "none",
            }}
          >
            <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5">
              <MealIcon name={section.name} fallbackEmoji={section.icon} />
            </span>
            <span className="truncate">{section.name}</span>
          </button>
        ))}
        
        {/* Edit Button */}
        <button 
          onClick={() => setIsSheetOpen(true)}
          className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-xl border border-dashed transition-colors hover:bg-gray-50 flex-shrink-0 ml-1"
          style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>



      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search food to add..."
          className="input-field pl-10 cursor-pointer"
          onFocus={() => navigate(`/food-db?meal=${activeTab}`)}
          readOnly
        />
      </div>

      {/* Summary Card */}
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Today&apos;s {activeSectionName}</p>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{Math.round(totalCalories)} kcal</p>
        </div>
        <button
          className="text-sm font-semibold rounded-xl px-4 py-2.5 transition-all duration-150 active:scale-[0.97]"
          onClick={() => navigate(`/food-db?meal=${activeTab}`)}
          style={{ background: "var(--green-primary)", color: "var(--text-on-green)", border: "none" }}
        >
          Add Food
        </button>
      </div>

      {/* Meal List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20 skeleton" />
          ))}
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--green-subtle)" }}>
            <UtensilsCrossed className="w-8 h-8" style={{ color: "var(--green-primary)" }} />
          </div>
          <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No {activeSectionName} logged yet</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Search and add food items to start tracking</p>
          <button
            className="text-sm font-semibold rounded-xl px-5 py-2.5 transition-all active:scale-[0.97]"
            onClick={() => navigate(`/food-db?meal=${activeTab}`)}
            style={{ background: "var(--green-primary)", color: "var(--text-on-green)", border: "none" }}
          >
            Add Food Item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeals.map((meal) => (
            <div 
              key={meal.id} 
              className="card flex items-center justify-between gap-3 border-l-[4px]"
              style={{ borderLeftColor: "var(--green-primary)" }}
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{meal.foodItem?.name || "Food item"}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {meal.quantity} {meal.unit} • {Math.round(meal.calories)} kcal
                </p>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: "#3b82f6" }}>P {meal.proteinG}g</span>
                  <span className="text-xs" style={{ color: "#22c55e" }}>C {meal.carbsG}g</span>
                  <span className="text-xs" style={{ color: "#f97316" }}>F {meal.fatG}g</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(meal.id)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-red-100 flex-shrink-0"
                style={{ background: "#fef2f2", color: "#ef4444" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    <MealSectionSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </>
  );
}
