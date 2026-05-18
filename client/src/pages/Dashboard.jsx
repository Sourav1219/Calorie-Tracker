import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useMealSections } from "../context/MealSectionContext";
import { logsAPI } from "../utils/api";
import { calculateMacroTargets } from "../utils/macroTargets";
import CalorieRing from "../components/CalorieRing";
import MacroBar from "../components/MacroBar";
import MealIcon from "../components/MealIcon";
import toast from "react-hot-toast";
import { RotateCcw, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

function AnimatedMacroCard({ macro, delayMs = 0 }) {
  const [currentValue, setCurrentValue] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    let startTime;
    const duration = 1000;
    const target = macro.value;
    const targetPct = macro.target > 0 ? Math.min((macro.value / macro.target) * 100, 100) : 0;

    const t1 = setTimeout(() => {
      setBarWidth(targetPct);
    }, delayMs + 50);

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const pct = Math.min(progress / duration, 1);

      const easeOut = 1 - Math.pow(1 - pct, 3);
      setCurrentValue(Math.round(target * easeOut));

      if (progress < duration) {
        requestAnimationFrame(step);
      } else {
        setCurrentValue(target);
      }
    };

    const t2 = setTimeout(() => {
      requestAnimationFrame(step);
    }, delayMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [macro.value, macro.target, delayMs]);

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border-default)",
      }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        {macro.label}
      </p>
      <p className="text-lg font-bold mt-0.5" style={{ color: macro.color }}>
        {currentValue}g
      </p>
      <div className="w-full h-1 rounded-full mt-2 overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            background: macro.color,
            transition: "width 1s cubic-bezier(0.34, 1.2, 0.64, 1)"
          }}
        />
      </div>
      <p className="text-[10px] mt-1 font-medium" style={{ color: "var(--text-muted)" }}>
        {currentValue}g / {macro.target}g
      </p>
    </div>
  );
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const { user } = useUser();
  const { sections } = useMealSections();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
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
    setIsLoading(true);
    try {
      const dateStr = formatDateKey(targetDate);
      const res = await logsAPI.getToday(dateStr);
      setLog(res.data.log || null);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    load();
  }, [load]);

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

  const confirmResetToday = async () => {
    setShowResetModal(false);
    const dateStr = formatDateKey(targetDate);
    const isToday = targetDate.toDateString() === new Date().toDateString();
    const label = isToday
      ? "today"
      : targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    try {
      setIsLoading(true);
      await logsAPI.resetToday(dateStr);
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

  const macroTargets = useMemo(() => user?.macroTargets ||
    calculateMacroTargets(calorieGoal, user?.goal, {
      weight: user?.weight,
      height: user?.height,
      age: user?.age,
    }), [user, calorieGoal]);

  const macroCards = [
    { label: "Protein", value: protein, target: macroTargets.proteinG, color: "#3b82f6", bg: "var(--blue-subtle)" },
    { label: "Carbs", value: carbs, target: macroTargets.carbsG, color: "#22c55e", bg: "var(--green-subtle)" },
    { label: "Fat", value: fat, target: macroTargets.fatG, color: "#f97316", bg: "var(--orange-subtle)" },
  ];

  const isToday = targetDate.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? "Today"
    : targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const hasEntries = calories > 0 || protein > 0 || carbs > 0 || fat > 0;

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

        <section className="rounded-3xl p-5 mb-5" style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}>
          <div className="skeleton h-44 w-44 rounded-full mx-auto" />
        </section>

        <section className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </section>

        <section className="rounded-3xl overflow-hidden" style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}>
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
          <div className="rounded-full p-3 shadow-lg" style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}>
            <Loader2 className={`w-5 h-5 text-green-500 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullY * 2}deg)` }} />
          </div>
        </div>
      )}

      <header className="flex items-center justify-between py-2 mb-4">
        <button
          onClick={() => changeDate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 no-spring"
          style={{ 
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
          }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </button>

        <div className="text-center animate-fade-in flex flex-col items-center px-2">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
            {dateLabel}
          </p>
          <h1 className="font-bold text-xl" style={{ color: "var(--text-primary)" }}>
            {isToday ? greeting : "Nutrition Log"}
          </h1>
        </div>

        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 disabled:opacity-30 no-spring"
          style={{ 
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
          }}
        >
          <ChevronRight className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </button>
      </header>

      <div className={`${slideDirection}`}>
        <section
          className="rounded-3xl p-5 animate-fade-up mb-5"
          style={{
            animationDelay: "0ms",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
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

          <div className="flex items-center justify-center py-2">
            <CalorieRing consumed={calories} goal={calorieGoal} size={176} />
          </div>
        </section>

        <section className="animate-fade-up mb-5" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Macros
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              grams / target
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {macroCards.map((macro, index) => (
              <AnimatedMacroCard key={macro.label} macro={macro} delayMs={index * 80} />
            ))}
          </div>
        </section>

        <section 
          className="animate-fade-up rounded-3xl overflow-hidden" 
          style={{ 
            animationDelay: "200ms",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--divider)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Meal Breakdown
            </p>
          </div>

          {sections.map((meal, index) => {
            const entries = log?.groupedMeals?.[meal._id] || [];
            const caloriesInMeal = Math.round(entries.reduce((sum, item) => sum + item.calories, 0));
            const pInMeal = entries.reduce((sum, item) => sum + item.proteinG, 0);
            const cInMeal = entries.reduce((sum, item) => sum + item.carbsG, 0);
            const fInMeal = entries.reduce((sum, item) => sum + item.fatG, 0);
            const mealTargetCal = sections.length > 0 ? Math.round(calorieGoal / sections.length) : 0;

            return (
              <div
                key={meal._id}
                className="p-5"
                style={{ borderTop: index === 0 ? "none" : "1px solid var(--divider)" }}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-default)" }}
                    >
                      <MealIcon name={meal.name} fallbackEmoji={meal.icon} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {meal.name}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {entries.length} item{entries.length !== 1 ? "s" : ""} • {caloriesInMeal} / {mealTargetCal} kcal
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/food-db?meal=${meal._id}`)}
                    className="text-xs font-semibold rounded-lg px-3 py-2 flex-shrink-0"
                    style={{
                      background: "var(--green-primary)",
                      color: "var(--text-on-green)",
                      border: "none",
                    }}
                  >
                    + Add
                  </button>
                </div>

                <MacroBar proteinG={pInMeal} carbsG={cInMeal} fatG={fInMeal} size="sm" />
              </div>
            );
          })}
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
              background: "var(--surface-1)", 
              border: "1px solid var(--border-default)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
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
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmResetToday}
                className="flex-1 py-2.5 rounded-xl font-semibold text-[13px] transition-all active:scale-[0.97]"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
