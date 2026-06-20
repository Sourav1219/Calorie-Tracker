import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, Edit2, UtensilsCrossed } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { mealsAPI, getLocalDateKey } from "../utils/api";
import { getCache, setCache, hasCache } from "../utils/pageCache";
import { dashCacheAddMeal, dashCacheRemoveMeal } from "../utils/logCache";
import { useMealSections } from "../context/MealSectionContext";
import MealSectionSheet from "../components/MealSectionSheet";
import MealIcon from "../components/MealIcon";
import FoodSearchModal from "../components/FoodSearchModal";
import FoodDetailModal from "../components/FoodDetailModal";

export default function MealLog() {
  const [searchParams] = useSearchParams();
  const mealParam = searchParams.get("meal");
  const { sections } = useMealSections();
  const [activeTab, setActiveTab] = useState(mealParam || "");
  // Seed today's meals from the per-session cache for an instant revisit.
  const mealsCacheKey = `meals:${getLocalDateKey(new Date())}`;
  const [meals, setMeals] = useState(() => (hasCache(mealsCacheKey) ? getCache(mealsCacheKey) : []));
  const [isLoading, setIsLoading] = useState(() => !hasCache(mealsCacheKey));
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);

  // Follow the ?meal= query param to its section tab — even when the page is
  // already mounted (the useState initializer only runs on first mount), so a
  // re-navigation like /log?meal=dinner always lands on the right tab.
  useEffect(() => {
    if (mealParam && sections.some((s) => s._id === mealParam)) {
      setActiveTab(mealParam);
    }
  }, [mealParam, sections]);

  // Make sure activeTab is valid, or fallback to the first section
  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s._id === activeTab)) {
      setActiveTab(sections[0]._id);
    }
  }, [sections, activeTab]);

  const fetchMeals = useCallback(async () => {
    // Only show the skeleton on a cold load; otherwise refresh in the background.
    if (!hasCache(mealsCacheKey)) setIsLoading(true);
    try {
      const res = await mealsAPI.getToday();
      const list = res.data.meals || [];
      setMeals(list);
      setCache(mealsCacheKey, list);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load meals");
    } finally {
      setIsLoading(false);
    }
  }, [mealsCacheKey]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  // Keep the cache current (incl. optimistic add/delete) for an instant revisit.
  useEffect(() => {
    setCache(mealsCacheKey, meals);
  }, [mealsCacheKey, meals]);

  const handleAddToMeal = async (food, quantity, unit, mealType, preview = {}) => {
    const targetSectionId = String(mealType || activeTab || sections[0]?._id || "").trim();
    const section = sections.find((s) => s._id === targetSectionId);

    // Show it immediately — close, switch to the section, drop in an optimistic
    // row — then persist in the background and reconcile (or revert on failure).
    setSearchOpen(false);
    if (targetSectionId) setActiveTab(targetSectionId);
    toast.success(`${food.name} added to ${section?.name || "meal"}`);

    const tempId = `temp-${Date.now()}`;
    const optimisticMeal = {
      id: tempId,
      foodItem: { name: food.name },
      mealType: targetSectionId,
      quantity,
      unit,
      calories: preview.calories || 0,
      proteinG: preview.proteinG || 0,
      carbsG: preview.carbsG || 0,
      fatG: preview.fatG || 0,
    };
    setMeals((cur) => [optimisticMeal, ...cur]);
    // Patch the dashboard's cached log NOW, optimistically — not after the save
    // returns. The row shows here instantly, so you may switch to the dashboard
    // before the create round-trips; doing this immediately means its calorie
    // ring already shows the new total on arrival (no stale value that jumps
    // once a background fetch lands).
    dashCacheAddMeal(optimisticMeal);

    try {
      const res = await mealsAPI.create({ foodItemId: food.id, quantity, unit, mealType: targetSectionId });
      // Reconcile using the server's authoritative create response — swap the
      // optimistic temp row for the saved one (real id + exact nutrition).
      // We deliberately do NOT refetch the whole day here: an immediate refetch
      // right after the write can return a stale response (read-after-write lag
      // / intermediary cache) that's missing the new item, which would wipe the
      // row we just added and make it look like nothing was logged until a
      // later reload. The create response always contains the new meal.
      const saved = res.data?.meal;
      if (saved) {
        setMeals((cur) => cur.map((m) => (m.id === tempId ? saved : m)));
        // Swap the optimistic entry in the dashboard cache for the exact saved one.
        dashCacheRemoveMeal(optimisticMeal);
        dashCacheAddMeal(saved);
      }
    } catch (error) {
      setMeals((cur) => cur.filter((m) => m.id !== tempId)); // revert
      dashCacheRemoveMeal(optimisticMeal); // undo the optimistic cache patch
      toast.error(error.response?.data?.error || "Failed to add food");
    }
  };

  const filteredMeals = useMemo(() => {
    // If a meal has a sectionId (stored in mealType field in db) that doesn't exist, it's considered deleted.
    // If the currently active tab is not found (which shouldn't happen because of the effect), handle it gracefully.
    return meals.filter((meal) => meal.mealType === activeTab);
  }, [activeTab, meals]);

  const totalCalories = filteredMeals.reduce((sum, meal) => sum + meal.calories, 0);

  const handleDelete = async (mealId) => {
    // Remove it instantly; delete on the server in the background and restore
    // the row only if that fails.
    const snapshot = meals;
    const removed = meals.find((meal) => meal.id === mealId);
    setMeals((current) => current.filter((meal) => meal.id !== mealId));
    toast.success("Meal removed");
    // Keep the dashboard's cached ring/totals in sync for the next visit.
    if (removed) dashCacheRemoveMeal(removed);
    try {
      await mealsAPI.remove(mealId);
    } catch (error) {
      setMeals(snapshot);
      if (removed) dashCacheAddMeal(removed); // restore the cache patch too
      toast.error(error.response?.data?.error || "Failed to delete meal");
    }
  };

  const activeSectionName = sections.find(s => s._id === activeTab)?.name || "Section";

  return (
    <>
      <div className="page-container animate-fade-in" style={{ background: "var(--bg-page)" }}>
      <div className="flex items-center gap-3 mb-5 mt-1">
        <div className="glass-green w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="w-[22px] h-[22px]" style={{ color: "var(--green-primary)" }} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-[22px] font-extrabold leading-none" style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            Meal Log
          </h1>
          <span className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            Track what you eat today
          </span>
        </div>
      </div>

      {/* Meal Type Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar items-center">
        {sections.map((section) => (
          <button
            key={section._id}
            onClick={() => setActiveTab(section._id)}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-semibold transition-all duration-200 w-[110px] flex-shrink-0 no-spring active:scale-95"
            style={{
              background: activeTab === section._id
                ? "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.10))"
                : "var(--tab-inactive-bg)",
              color: activeTab === section._id ? "var(--green-primary)" : "var(--tab-inactive-color)",
              border: activeTab === section._id ? "1px solid rgba(34,197,94,0.38)" : "1px solid var(--tab-inactive-border)",
              boxShadow: activeTab === section._id
                ? "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 8px rgba(34,197,94,0.14)"
                : "var(--tab-inactive-shadow)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
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
          aria-label="Edit meal sections"
          className="glass-green flex items-center justify-center min-w-[36px] min-h-[36px] rounded-xl flex-shrink-0 ml-1 no-spring active:scale-95"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{activeSectionName}</p>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{Math.round(totalCalories)} kcal</p>
        </div>
        <button
          className="glass-green text-sm font-bold rounded-xl px-4 py-2.5 transition-all duration-200 hover:scale-[1.05] active:scale-95 no-spring"
          onClick={() => setSearchOpen(true)}
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
        <div
          className="rounded-2xl text-center py-12 px-4"
          style={{
            background: "linear-gradient(145deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.05) 60%, rgba(34,197,94,0.09) 100%)",
            border: "1px solid rgba(34,197,94,0.18)",
            boxShadow: "0 4px 20px rgba(34,197,94,0.07), inset 0 1px 0 rgba(255,255,255,0.65)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.10))",
              border: "1px solid rgba(34,197,94,0.25)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <UtensilsCrossed className="w-7 h-7" style={{ color: "var(--green-primary)" }} />
          </div>
          <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>No {activeSectionName} logged yet</h3>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>Search and add food items to start tracking</p>
          <button
            className="glass-green text-sm font-bold rounded-xl px-5 py-2.5 transition-all duration-200 hover:scale-[1.05] active:scale-95 no-spring"
            onClick={() => setSearchOpen(true)}
          >
            Add Food Item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMeals.map((meal) => (
            <div
              key={meal.id}
              className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-3"
              style={{
                background: "rgba(125,140,170,0.06)",
                border: "1px solid var(--lg-border)",
                borderLeft: "4px solid var(--green-primary)",
              }}
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{meal.foodItem?.name || "Food item"}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {meal.quantity} {meal.unit} • {Math.round(meal.calories)} kcal
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: "#7c93f0" }}>P {meal.proteinG}</span>
                  <span className="text-[11px] font-semibold" style={{ color: "#52bd8a" }}>C {meal.carbsG}</span>
                  <span className="text-[11px] font-semibold" style={{ color: "#f0857e" }}>F {meal.fatG}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(meal.id)}
                aria-label={`Remove ${meal.foodItem?.name || "item"}`}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
                style={{
                  background: "linear-gradient(180deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.07) 100%)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                  color: "#ef4444",
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    <MealSectionSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />

    <FoodSearchModal
      isOpen={searchOpen}
      onClose={() => setSearchOpen(false)}
      mealType={activeSectionName}
      onSelect={(food) => {
        setSelectedFood(food);
      }}
    />

    <FoodDetailModal
      food={selectedFood}
      onClose={() => setSelectedFood(null)}
      onAddToMeal={handleAddToMeal}
      targetSectionId={activeTab}
    />
    </>
  );
}
