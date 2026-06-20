import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useUser } from "../context/UserContext";
import { useMealSections } from "../context/MealSectionContext";
import { logsAPI, mealsAPI, getLocalDateKey } from "../utils/api";
import { getCache, setCache, hasCache, clearCache } from "../utils/pageCache";
import { mealsCacheAddMeal } from "../utils/logCache";
import { calculateMacroTargets } from "../utils/macroTargets";
import CalorieRing from "../components/CalorieRing";
import AnimatedNumber from "../components/AnimatedNumber";
import MacroBar from "../components/MacroBar";
import MealIcon from "../components/MealIcon";
import FoodSearchModal from "../components/FoodSearchModal";
import FoodDetailModal from "../components/FoodDetailModal";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { RotateCcw, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

function fireGoalConfetti() {
  const colors = ["#22c55e", "#14b8a6", "#86efac", "#facc15"];
  const defaults = { startVelocity: 32, spread: 360, ticks: 70, zIndex: 9999, colors };
  // Two side bursts for a celebratory pop
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.2, y: 0.4 } });
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.8, y: 0.4 } });
}

function AnimatedMacroCard({ macro, delayMs = 0 }) {
  const [barWidth, setBarWidth] = useState(0);
  // Staggered fill on first paint; snappy on later value changes so macros keep
  // pace with the calorie ring the moment food is logged.
  const hasAnimatedRef = useRef(false);
  const [barMs, setBarMs] = useState(1000);
  const [numberMs, setNumberMs] = useState(520);

  useEffect(() => {
    const targetPct = macro.target > 0 ? Math.min((macro.value / macro.target) * 100, 100) : 0;

    if (!hasAnimatedRef.current) {
      const t1 = setTimeout(() => {
        setBarWidth(targetPct);
        hasAnimatedRef.current = true;
      }, delayMs + 50);
      return () => clearTimeout(t1);
    }

    setBarMs(380);
    setNumberMs(360);
    setBarWidth(targetPct);
  }, [macro.value, macro.target, delayMs]);

  const pct = macro.target > 0 ? Math.round(Math.min((macro.value / macro.target) * 100, 100)) : 0;

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: "var(--lg-tint)",
        border: "1px solid var(--lg-border)",
        boxShadow: "inset 0 1px 0 var(--lg-hl-top)",
      }}
    >
      {/* Label gets its own full-width row with a small colour dot, so it never
          truncates or collides with the percentage on narrow screens. */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: macro.color }}
        />
        <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          {macro.label}
        </p>
      </div>

      {/* Value */}
      <p className="mt-1.5 text-lg leading-none font-extrabold" style={{ color: macro.color }}>
        <AnimatedNumber value={macro.value} duration={numberMs} />
        <span className="text-xs font-bold">g</span>
      </p>

      {/* Glossy, recessed progress bar with a soft color glow */}
      <div
        className="w-full h-1.5 rounded-full mt-2.5"
        style={{ background: "var(--bg-subtle)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.14)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            minWidth: barWidth > 0 ? "6px" : 0,
            background: `linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%), ${macro.color}`,
            boxShadow: `0 0 8px ${macro.color}80, inset 0 1px 0 rgba(255,255,255,0.4)`,
            transition: `width ${barMs}ms cubic-bezier(0.34, 1.2, 0.64, 1)`,
          }}
        />
      </div>

      {/* Footer: percentage of goal + absolute target, on opposite ends */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] font-extrabold" style={{ color: macro.color }}>
          {pct}%
        </span>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          of {macro.target}g
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const { sections } = useMealSections();
  // Seed from the per-session cache so revisiting this tab shows the last-known
  // figures instantly instead of flashing a skeleton and re-animating.
  const initialCacheKey = `dash:${getLocalDateKey(new Date())}`;
  const [log, setLog] = useState(() => (hasCache(initialCacheKey) ? getCache(initialCacheKey) : null));
  // Mirror `log` in a ref so load() can tell whether it's refreshing the date
  // already on screen, without listing `log` as a dependency.
  const logRef = useRef(log);
  logRef.current = log;
  const [isLoading, setIsLoading] = useState(() => !hasCache(initialCacheKey));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [activeMealId, setActiveMealId] = useState(null);
  const pullProgress = useRef(0);
  const pullStartY = useRef(0);
  const pullStartX = useRef(0);
  const touchEndX = useRef(0);
  const [pullY, setPullY] = useState(0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Good night"; // For late night / early morning
  }, []);

  const load = useCallback(async () => {
    const dateStr = getLocalDateKey(targetDate);
    const cacheKey = `dash:${dateStr}`;
    // Seed from cache only when we're NOT already showing this date's data.
    // On a date switch / cold load that gives an instant "already there" render.
    // But on a refresh of the date we're already on (e.g. right after adding or
    // resetting), seeding from cache would replace the just-updated state with
    // the older cached snapshot — items briefly vanish, then the network brings
    // them back. Skipping the seed there keeps the refresh silent.
    const showingSameDate = logRef.current?.date === dateStr;
    if (!showingSameDate) {
      if (hasCache(cacheKey)) {
        setLog(getCache(cacheKey));
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }
    try {
      const res = await logsAPI.getToday(dateStr);
      const fresh = res.data.log || null;
      setLog(fresh);
      setCache(cacheKey, fresh);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    load();
  }, [load]);

  // Mirror the live log into its cache so optimistic add/delete survives a quick
  // tab revisit. Guarded by date so switching days never writes the previous
  // day's data under the new day's key (load() refreshes it right after).
  useEffect(() => {
    if (log && log.date === getLocalDateKey(targetDate)) {
      setCache(`dash:${getLocalDateKey(targetDate)}`, log);
    }
  }, [log, targetDate]);

  const changeDate = (days) => {
    const newDate = new Date(targetDate);
    newDate.setDate(newDate.getDate() + days);
    // Don't allow future dates
    if (newDate > new Date()) return;
    setSlideDirection(days > 0 ? "animate-slide-in-right" : "animate-slide-in-left");
    setTargetDate(newDate);
    setTimeout(() => setSlideDirection(""), 400);
  };

  const handleTouchStart = (e) => {
    if (window.scrollY <= 0) pullStartY.current = e.touches[0].clientY;
    pullStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    if (pullStartY.current > 0 && window.scrollY <= 0) {
      const y = e.touches[0].clientY;
      const diffY = y - pullStartY.current;
      if (diffY > 0 && diffY > Math.abs(touchEndX.current - pullStartX.current)) {
        pullProgress.current = Math.min(diffY * 0.4, 80);
        setPullY(pullProgress.current);
      }
    }
  };

  const handleTouchEnd = async () => {
    const diffX = pullStartX.current - touchEndX.current;

    if (Math.abs(diffX) > 70) {
      // Horizontal Swipe
      if (diffX > 0) {
        changeDate(1);
      } else {
        changeDate(-1);
      }
    } else if (pullProgress.current > 60 && !isRefreshing) {
      // Vertical Pull
      setIsRefreshing(true);
      setPullY(40);
      await load();
      setIsRefreshing(false);
    }

    pullStartY.current = 0;
    pullStartX.current = 0;
    pullProgress.current = 0;
    setPullY(0);
  };

  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const openFoodSearch = (mealId) => {
    setActiveMealId(mealId);
    setSearchOpen(true);
  };

  const handleAddToMeal = async (food, quantity, unit, mealType, preview = {}) => {
    const targetSectionId = String(mealType || activeMealId || sections[0]?._id || "").trim();
    const section = sections.find((s) => s._id === targetSectionId);

    toast.success(`${food.name} added to ${section?.name || "meal"}`);

    // Optimistic row for the breakdown + a matching bump to the ring/macros.
    const tempId = `temp-${Date.now()}`;
    const optimisticMeal = {
      id: tempId,
      mealType: targetSectionId,
      quantity,
      unit,
      calories: preview.calories || 0,
      proteinG: preview.proteinG || 0,
      carbsG: preview.carbsG || 0,
      fatG: preview.fatG || 0,
      foodItem: { name: food.name },
    };

    setLog((cur) => {
      const base = cur || {};
      const grouped = { ...(base.groupedMeals || {}) };
      grouped[targetSectionId] = [optimisticMeal, ...(grouped[targetSectionId] || [])];
      return {
        ...base,
        totalCalories: (base.totalCalories || 0) + (preview.calories || 0),
        totalProteinG: (base.totalProteinG || 0) + (preview.proteinG || 0),
        totalCarbsG: (base.totalCarbsG || 0) + (preview.carbsG || 0),
        totalFatG: (base.totalFatG || 0) + (preview.fatG || 0),
        meals: [optimisticMeal, ...(base.meals || [])],
        groupedMeals: grouped,
      };
    });

    try {
      const res = await mealsAPI.create({ foodItemId: food.id, quantity, unit, mealType: targetSectionId });
      const saved = res.data?.meal;
      if (!saved) return;
      // Keep the meal-log's cached list in sync for an instant, correct revisit.
      mealsCacheAddMeal(saved);
      // Reconcile against the authoritative create response — swap the temp row
      // for the saved one and correct the totals by the rounding delta. We do
      // NOT reload here: an immediate refetch can return a stale read-after-write
      // response missing the new item, which would revert the ring and drop the
      // row until a later reload (the bug this mirrors from the Meal Log).
      const swap = (m) => (m.id === tempId ? saved : m);
      setLog((cur) => {
        if (!cur) return cur;
        const grouped = { ...(cur.groupedMeals || {}) };
        for (const key of Object.keys(grouped)) grouped[key] = grouped[key].map(swap);
        return {
          ...cur,
          totalCalories: (cur.totalCalories || 0) + ((saved.calories || 0) - (preview.calories || 0)),
          totalProteinG: (cur.totalProteinG || 0) + ((saved.proteinG || 0) - (preview.proteinG || 0)),
          totalCarbsG: (cur.totalCarbsG || 0) + ((saved.carbsG || 0) - (preview.carbsG || 0)),
          totalFatG: (cur.totalFatG || 0) + ((saved.fatG || 0) - (preview.fatG || 0)),
          meals: (cur.meals || []).map(swap),
          groupedMeals: grouped,
        };
      });
    } catch (error) {
      // Revert the optimistic add (remove the temp row + subtract its totals).
      const drop = (list) => (list || []).filter((m) => m.id !== tempId);
      setLog((cur) => {
        if (!cur) return cur;
        const grouped = { ...(cur.groupedMeals || {}) };
        for (const key of Object.keys(grouped)) grouped[key] = drop(grouped[key]);
        return {
          ...cur,
          totalCalories: (cur.totalCalories || 0) - (preview.calories || 0),
          totalProteinG: (cur.totalProteinG || 0) - (preview.proteinG || 0),
          totalCarbsG: (cur.totalCarbsG || 0) - (preview.carbsG || 0),
          totalFatG: (cur.totalFatG || 0) - (preview.fatG || 0),
          meals: drop(cur.meals),
          groupedMeals: grouped,
        };
      });
      toast.error(error.response?.data?.error || "Failed to add food");
    }
  };

  const confirmResetToday = async () => {
    setShowResetModal(false);
    const dateStr = getLocalDateKey(targetDate);
    const isToday = targetDate.toDateString() === new Date().toDateString();
    const label = isToday
      ? "today"
      : targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    try {
      setIsLoading(true);
      await logsAPI.resetToday(dateStr);
      // Drop every page's cached snapshot for this date so the Meal Log / Water
      // tabs don't seed from a stale cache that still lists the deleted items.
      clearCache(`dash:${dateStr}`);
      clearCache(`meals:${dateStr}`);
      clearCache(`water:${dateStr}`);
      toast.success(`Dashboard reset for ${label}`);
      // Reload dashboard data
      await load();
    } catch (error) {
      toast.error("Failed to reset dashboard");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const { calories, protein, carbs, fat, remaining } = useMemo(() => {
    const cal = Math.round(log?.totalCalories || 0);
    return {
      calories: cal,
      protein: Math.round(log?.totalProteinG || 0),
      carbs: Math.round(log?.totalCarbsG || 0),
      fat: Math.round(log?.totalFatG || 0),
      remaining: Math.max((user?.dailyCalorieGoal || 2000) - cal, 0)
    };
  }, [log, user?.dailyCalorieGoal]);

  const calorieGoal = user?.dailyCalorieGoal || 2000;

  // Fire confetti only when the user crosses the goal during this session
  // (not on initial load or when switching to an already-completed day).
  const goalMetRef = useRef(false);
  const goalInitRef = useRef(false);

  useEffect(() => {
    goalInitRef.current = false; // re-arm without firing whenever the date changes
  }, [targetDate]);

  useEffect(() => {
    if (isLoading) return;
    const met = calorieGoal > 0 && calories >= calorieGoal;
    if (!goalInitRef.current) {
      goalInitRef.current = true;
      goalMetRef.current = met;
      return;
    }
    if (met && !goalMetRef.current) {
      fireGoalConfetti();
    }
    goalMetRef.current = met;
  }, [calories, calorieGoal, isLoading, targetDate]);

  const macroTargets = useMemo(() => user?.macroTargets ||
    calculateMacroTargets(calorieGoal, user?.goal, {
      weight: user?.weight,
      height: user?.height,
      age: user?.age,
    }), [user, calorieGoal]);

  const macroCards = [
    { label: "Protein", value: protein, target: macroTargets.proteinG, color: "#7c93f0", bg: "var(--blue-subtle)" },
    { label: "Carbs", value: carbs, target: macroTargets.carbsG, color: "#52bd8a", bg: "var(--green-subtle)" },
    { label: "Fat", value: fat, target: macroTargets.fatG, color: "#f0857e", bg: "var(--orange-subtle)" },
  ];

  const isToday = targetDate.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? "Today"
    : targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const hasEntries = calories > 0 || protein > 0 || carbs > 0 || fat > 0;
  const loggedMealCount = sections.filter((m) => (log?.groupedMeals?.[m._id] || []).length > 0).length;

  if (isLoading) {
    return (
      <div className="page-container" style={{ background: "var(--bg-page)" }}>
        <header className="flex justify-between items-center mb-5 pt-2">
          <div>
            <div className="skeleton h-4 w-24 mb-2 rounded-lg" />
            <div className="skeleton h-7 w-36 rounded-lg" />
          </div>
          <div className="skeleton h-10 w-20 rounded-xl" />
        </header>

        <section className="rounded-3xl p-5 mb-5" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)" }}>
          <div className="skeleton h-44 w-44 rounded-full mx-auto" />
        </section>

        <section className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </section>

        <section className="rounded-3xl overflow-hidden" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)" }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full mb-4 last:mb-0 mx-4 my-4 rounded-xl" />)}
        </section>
      </div>
    );
  }

  return (
      <div 
        className="page-container relative transition-transform duration-200" 
        style={{ 
          background: "var(--bg-page)",
          transform: `translateY(${pullY}px)` 
        }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {(pullY > 0 || isRefreshing) && (
        <div className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 -mt-16 z-50">
          <div className="glass-green rounded-full p-3">
            <Loader2 className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} style={{ color: "var(--green-primary)", transform: `rotate(${pullY * 2}deg)` }} />
          </div>
        </div>
      )}

      <header className="flex items-center justify-between py-2 mb-4">
        <button
          onClick={() => changeDate(-1)}
          className="glass-green w-10 h-10 rounded-xl flex items-center justify-center no-spring active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--green-primary)" }} />
        </button>

        <div className="text-center animate-fade-in flex flex-col items-center px-2">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
            {dateLabel}
          </p>
          <h1 className="font-bold text-xl font-display" style={{ color: "var(--text-primary)" }}>
            {isToday ? greeting : "Nutrition Log"}
          </h1>
        </div>

        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="glass-green w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 no-spring active:scale-95"
        >
          <ChevronRight className="w-5 h-5" style={{ color: "var(--green-primary)" }} />
        </button>
      </header>

      <div className={`${slideDirection}`}>
        <section
          className="relative rounded-[28px] p-5 animate-fade-up mb-5 overflow-hidden"
          style={{
            animationDelay: "0ms",
            border: "1px solid var(--lg-border)",
            boxShadow:
              "inset 0 1px 0 0 var(--lg-hl-top), inset 0 -1px 1px 0 var(--lg-hl-bottom)",
          }}
        >
          {/* Gradient mesh backdrop */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 12% 12%, rgba(34,197,94,0.14), transparent 45%)," +
                "radial-gradient(circle at 88% 20%, rgba(20,184,166,0.12), transparent 45%)," +
                "radial-gradient(circle at 50% 110%, rgba(59,130,246,0.10), transparent 55%)",
            }}
          />

          <div className="relative">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Calorie Goal
                </p>
              </div>
              {hasEntries && (
                <button
                  onClick={handleResetClick}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                  style={{
                    color: "#ef4444",
                    background: "var(--rose-subtle)",
                    border: "1px solid var(--rose-border)",
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center justify-center py-3">
              <CalorieRing consumed={calories} goal={calorieGoal} size={196} />
            </div>

            {/* Macro stats integrated into the hero */}
            <div
              className="grid grid-cols-3 gap-3 pt-4 mt-2"
              style={{ borderTop: "1px solid var(--divider)" }}
            >
              {macroCards.map((macro, index) => (
                <AnimatedMacroCard key={macro.label} macro={macro} delayMs={index * 80} />
              ))}
            </div>
          </div>
        </section>

        <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Meal Breakdown
            </h2>
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {loggedMealCount} of {sections.length} logged
            </span>
          </div>

          <div className="space-y-3">
            {sections.map((meal, index) => {
              const entries = log?.groupedMeals?.[meal._id] || [];
              const caloriesInMeal = Math.round(entries.reduce((sum, item) => sum + item.calories, 0));
              const pInMeal = entries.reduce((sum, item) => sum + item.proteinG, 0);
              const cInMeal = entries.reduce((sum, item) => sum + item.carbsG, 0);
              const fInMeal = entries.reduce((sum, item) => sum + item.fatG, 0);
              const mealTargetCal = sections.length > 0 ? Math.round(calorieGoal / sections.length) : 0;
              const isEmpty = entries.length === 0;

              return (
                <div
                  key={meal._id}
                  className="liquid-glass rounded-2xl p-4 animate-fade-up"
                  style={{ animationDelay: `${250 + index * 70}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="glass-green w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg">
                      <MealIcon name={meal.name} fallbackEmoji={meal.icon} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {meal.name}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {entries.length} item{entries.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base leading-none" style={{ color: "var(--text-primary)" }}>
                        {caloriesInMeal}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                        / {mealTargetCal} kcal
                      </p>
                    </div>

                    <button
                      onClick={() => openFoodSearch(meal._id)}
                      aria-label={`Add to ${meal.name}`}
                      className="glass-green w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold hover:scale-[1.05] active:scale-90 transition-all duration-200 no-spring"
                    >
                      +
                    </button>
                  </div>

                  {!isEmpty && (
                    <div className="mt-3.5">
                      <MacroBar proteinG={pInMeal} carbsG={cInMeal} fatG={fInMeal} size="sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showResetModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 animate-overlay-fade"
          style={{ background: "rgba(0, 0, 0, 0.35)" }}
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="rounded-2xl px-5 py-4 w-full max-w-[280px] animate-popup-scale"
            style={{
              background: "linear-gradient(180deg, var(--lg-sheen), transparent 30%), var(--surface-glass)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid var(--lg-border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18), inset 0 1px 0 var(--lg-hl-top)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-[15px] text-center mb-1" style={{ color: "var(--text-primary)" }}>
              Reset tracking?
            </p>
            <p className="text-xs text-center leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
              This will clear all meals & water for {isToday ? "today" : targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-[13px] transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(180deg, var(--lg-sheen), transparent 40%), var(--surface-glass)",
                  backdropFilter: "blur(16px) saturate(160%)",
                  WebkitBackdropFilter: "blur(16px) saturate(160%)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--lg-border)",
                  boxShadow: "inset 0 1px 0 var(--lg-hl-top), inset 0 -1px 0 var(--lg-hl-bottom)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmResetToday}
                className="flex-1 py-2.5 rounded-xl font-semibold text-[13px] transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(180deg, rgba(239,68,68,0.22), rgba(239,68,68,0.12))",
                  backdropFilter: "blur(16px) saturate(160%)",
                  WebkitBackdropFilter: "blur(16px) saturate(160%)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                  boxShadow: "0 3px 12px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <FoodSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        mealType={sections.find((s) => s._id === activeMealId)?.name || "meal"}
        onSelect={(food) => {
          setSearchOpen(false);
          setSelectedFood(food);
        }}
      />

      <FoodDetailModal
        food={selectedFood}
        onClose={() => setSelectedFood(null)}
        onAddToMeal={handleAddToMeal}
        targetSectionId={activeMealId}
      />
    </div>
  );
}
