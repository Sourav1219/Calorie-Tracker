import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Droplets, Utensils, X } from "lucide-react";
import { logsAPI } from "../utils/api";
import { getCache, setCache } from "../utils/pageCache";
import { useUser } from "../context/UserContext";
import { useMealSections } from "../context/MealSectionContext";
import MealIcon from "../components/MealIcon";

function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function Calendar() {
  const { user } = useUser();
  const { sections } = useMealSections();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthLogs, setMonthLogs] = useState(
    () => getCache(`calendar:${new Date().getFullYear()}-${new Date().getMonth()}`) || []
  );
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState("Calories");
  const [direction, setDirection] = useState("");

  const calorieGoal = user?.dailyCalorieGoal || 2000;
  const waterGoal = user?.dailyWaterGoalMl || 2500;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  useEffect(() => {
    let active = true;
    const monthKey = `calendar:${year}-${month}`;
    // Show the cached month immediately so the grid never blanks on revisit.
    const cachedMonth = getCache(monthKey);
    if (cachedMonth) setMonthLogs(cachedMonth);

    const fetchMonthLogs = async () => {
      try {
        const res = await logsAPI.getMonth(month + 1, year);
        if (!active) return;
        const logs = res.data.logs || [];
        setMonthLogs(logs);
        setCache(monthKey, logs);
      } catch (error) {
        console.error("Failed to load monthly logs:", error);
      }
    };
    fetchMonthLogs();
    return () => { active = false; };
  }, [month, year]);

  useEffect(() => {
    if (!selectedDateKey) {
      setSelectedLog(null);
      return;
    }
    let active = true;
    const fetchSelectedLog = async () => {
      try {
        const res = await logsAPI.getByDate(selectedDateKey);
        if (!active) return;
        setSelectedLog(res.data.log);
        // Cache the detailed day log so reopening it is instant (no refetch flash).
        setCache(`day:${selectedDateKey}`, res.data.log);
      } catch (error) {
        console.error("Failed to load selected log:", error);
      }
    };
    fetchSelectedLog();
    return () => { active = false; };
  }, [selectedDateKey]);

  const logsByDate = useMemo(() => new Map(monthLogs.map((log) => [log.date, log])), [monthLogs]);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push({ day: null, outMonth: true, key: `p-${i}` });
  for (let d = 1; d <= daysInMonth; d++) days.push({ day: d, outMonth: false, key: `c-${d}` });

  const prevMonthDaysCount = firstDay;
  if (prevMonthDaysCount > 0) {
    const prevMonthTotal = new Date(year, month, 0).getDate();
    for (let i = prevMonthDaysCount - 1; i >= 0; i--) {
      days[i] = { day: prevMonthTotal - i, outMonth: true, key: `pm-${i}` };
    }
  }

  const tailNeeded = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= tailNeeded; i++) days.push({ day: i, outMonth: true, key: `nm-${i}` });

  const handlePrevMonth = () => {
    setDirection("slide-in-left");
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDirection("slide-in-right");
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (dateKey) => {
    if (selectedDateKey === dateKey) return;
    // Seed the panel instantly instead of flashing "No data logged" while the
    // detailed fetch runs: prefer a cached full day log, otherwise fall back to
    // the month grid's totals (already loaded) so calories/water + bars show
    // immediately. The detailed meal/water breakdown then fills in on fetch.
    const cachedDay = getCache(`day:${dateKey}`);
    setSelectedLog(cachedDay || logsByDate.get(dateKey) || null);
    setSelectedDateKey(dateKey);
  };

  // Safe variables for rendering
  const isPanelOpen = !!selectedDateKey;
  const cLog = selectedLog || {};
  const hasData = cLog?.totalCalories > 0 || cLog?.totalWaterMl > 0;
  
  const cals = cLog.totalCalories || 0;
  const water = cLog.totalWaterMl || 0;
  
  const calPct = Math.min((cals / calorieGoal) * 100, 100);
  const waterPct = Math.min((water / waterGoal) * 100, 100);

  return (
    <div className="page-container" style={{ background: "var(--bg-page)" }}>
      <div className="w-full pb-10">
        <div className="flex items-center gap-3 mb-6 mt-1">
          <div className="glass-green w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-[22px] h-[22px]" style={{ color: "var(--green-primary)" }} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[22px] font-extrabold leading-none" style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
              Calendar
            </h1>
            <span className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
              Your daily history
            </span>
          </div>
        </div>

        <div className="card p-4 sm:p-5 mb-6 rounded-[16px] w-full box-border">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="glass-green w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold truncate px-2 text-center flex-1" style={{ color: "var(--text-primary)" }}>{monthNames[month]} {year}</h2>
          <button
            onClick={handleNextMonth}
            aria-label="Next month"
            className="glass-green w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-7 gap-1 mb-2 w-full">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-bold py-1 w-full" style={{ color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>

          <div key={`${year}-${month}`} className={`grid grid-cols-7 gap-1 w-full ${direction === 'slide-in-right' ? 'animate-slide-in-right' : direction === 'slide-in-left' ? 'animate-slide-in-left' : 'animate-fade-in'}`}>
            {days.map((entry) => {
              const { day, outMonth, key } = entry;
              const dateKey = day && !outMonth ? formatDateKey(year, month, day) : null;
              const logForDay = dateKey ? logsByDate.get(dateKey) : null;
              const isSelected = dateKey && selectedDateKey === dateKey;
              const isCurrentToday = dateKey === todayKey;
              
              const hasCals = logForDay?.totalCalories > 0;
              const hasWater = logForDay?.totalWaterMl > 0;

              return (
                <div key={key} className="w-full aspect-square">
                  <button
                    type="button"
                    onClick={() => dateKey && handleDateClick(dateKey)}
                    disabled={outMonth}
                    className="w-full h-full rounded-[12px] flex flex-col items-center justify-center relative transition-all duration-200 active:scale-[0.92] hover:bg-green-500/10 box-border"
                    style={{
                      background: isSelected ? "#16A34A" : "transparent",
                      color: outMonth ? "#D1D5DB" : isSelected ? "#ffffff" : "var(--text-primary)",
                      border: isCurrentToday && !isSelected ? "2px solid #16A34A" : "2px solid transparent",
                      fontWeight: isCurrentToday || isSelected ? 700 : 500,
                      opacity: outMonth ? 0 : 1,
                      pointerEvents: outMonth ? 'none' : 'auto',
                      fontSize: "clamp(12px, 3.5vw, 16px)"
                    }}
                  >
                    <span className="z-10 mt-[-2px]">{day}</span>
                    {/* Dots indicator */}
                    <div className="absolute bottom-1 md:bottom-1.5 flex gap-[2px] z-10 w-full justify-center">
                      {hasCals && !isSelected && <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#16A34A] animate-fade-in" />}
                      {hasWater && !isSelected && <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#38BDF8] animate-fade-in" />}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        </div>
        
        {monthLogs.length === 0 && (
          <div className="mt-6 text-center animate-fade-up">
            <p className="text-sm font-semibold text-[var(--text-muted)]">Start logging to see your progress here 📅</p>
          </div>
        )}
      </div>

      {/* Full viewport centered overlay popup */}
      {isPanelOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 box-border bg-black/50 glass-overlay animate-overlay-fade"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          onClick={() => setSelectedDateKey(null)}
        >
          <div
            className="rounded-[24px] w-full max-w-[420px] max-h-[80dvh] flex flex-col overflow-hidden animate-popup-scale shadow-2xl"
            style={{
              background: "linear-gradient(180deg, var(--lg-sheen), transparent 25%), var(--surface-glass)",
              backdropFilter: "blur(28px) saturate(190%)",
              WebkitBackdropFilter: "blur(28px) saturate(190%)",
              border: "1px solid var(--lg-border)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.18), inset 0 1px 0 var(--lg-hl-top)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--lg-border)" }}>
              <h3 className="text-lg font-black text-[var(--text-primary)] truncate pr-4">
                {new Date(selectedDateKey + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <button
                onClick={() => setSelectedDateKey(null)}
                aria-label="Close"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto w-full box-border">
              {/* Tab Toggles */}
              <div className="p-4 w-full box-border pb-2">
                <div className="flex w-full rounded-[12px] p-1 box-border" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)" }}>
                  <button 
                    onClick={() => setActiveTab("Calories")}
                    className="flex-1 text-center py-2 rounded-[10px] text-sm font-medium transition-all duration-200"
                    style={{ 
                      background: activeTab === "Calories" ? "var(--surface-glass)" : "transparent",
                      color: activeTab === "Calories" ? "#16A34A" : "var(--text-muted)",
                      boxShadow: activeTab === "Calories" ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
                    }}
                  >
                    <Utensils className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Calories
                  </button>
                  <button 
                    onClick={() => setActiveTab("Water")}
                    className="flex-1 text-center py-2 rounded-[10px] text-sm font-medium transition-all duration-200"
                    style={{ 
                      background: activeTab === "Water" ? "var(--surface-glass)" : "transparent",
                      color: activeTab === "Water" ? "#38BDF8" : "var(--text-muted)",
                      boxShadow: activeTab === "Water" ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
                    }}
                  >
                    <Droplets className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Water
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-5 pt-2 w-full box-border animate-fade-in" key={activeTab}>
                {!hasData ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center text-[var(--text-muted)]">
                    <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
                    <p className="font-semibold">📭 No data logged for this day</p>
                  </div>
                ) : activeTab === "Calories" ? (
                  <div className="space-y-6 w-full">
                    <div className="w-full">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[var(--text-muted)] font-bold text-sm">Total Calories</span>
                        <span className="text-[var(--text-primary)] font-black text-lg">{Math.round(cals)} <span className="text-[var(--text-muted)] text-sm font-semibold">/ {calorieGoal} kcal</span></span>
                      </div>
                      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)" }}>
                        <div className="h-full bg-[#16A34A] rounded-full transition-all duration-700 ease-out" style={{ width: `${calPct}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
                      {[
                        { label: "Protein", val: cLog.totalProteinG, color: "#7c93f0" },
                        { label: "Carbs", val: cLog.totalCarbsG, color: "#52bd8a" },
                        { label: "Fat", val: cLog.totalFatG, color: "#f0857e" }
                      ].map(m => {
                        const max = 150;
                        const mpct = Math.min(((m.val || 0) / max) * 100, 100);
                        return (
                          <div key={m.label} className="p-2 sm:p-3 rounded-xl w-full box-border" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)" }}>
                            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold mb-1 uppercase tracking-wider">{m.label}</p>
                            <p className="text-sm sm:text-lg font-black text-[var(--text-primary)] mb-2">{Math.round(m.val || 0)}g</p>
                            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)" }}>
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${mpct}%`, background: m.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="w-full">
                      <h4 className="text-[var(--text-muted)] font-bold text-sm uppercase tracking-wider mb-3">Meals</h4>
                      {!cLog.groupedMeals ? (
                        <p className="text-sm text-[var(--text-muted)] font-medium">Loading meals…</p>
                      ) : Object.keys(cLog.groupedMeals).length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] font-medium">No meals logged.</p>
                      ) : (
                        <div className="space-y-3 w-full">
                          {Object.entries(cLog.groupedMeals || {}).map(([mealType, items]) => {
                            const section = sections.find(s => s._id === mealType);
                            const sectionName = section ? section.name : "Deleted section";
                            const mealCals = items.reduce((sum, item) => sum + item.calories, 0);
                            return (
                              <div key={mealType} className="rounded-xl p-3 sm:p-4 w-full box-border" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)" }}>
                                <div className="flex justify-between items-center mb-3">
                                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                    {section ? (
                                      <span className="inline-flex items-center justify-center flex-shrink-0 w-7 h-7 overflow-hidden">
                                        <MealIcon name={section.name} fallbackEmoji={section.icon} />
                                      </span>
                                    ) : null}
                                    {sectionName}
                                  </span>
                                  <span className="text-[#16A34A] font-bold text-sm">{Math.round(mealCals)} kcal</span>
                                </div>
                                <div className="space-y-1.5 w-full">
                                  {items.map(item => (
                                    <div key={item.id} className="flex justify-between text-xs font-medium text-[var(--text-muted)] w-full truncate">
                                      <span className="truncate pr-2">• {item.foodItem?.name || 'Custom Food'} ({item.quantity}{item.unit})</span>
                                      <span className="flex-shrink-0">{Math.round(item.calories)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 w-full">
                    <div className="w-full">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[var(--text-muted)] font-bold text-sm">Total Water</span>
                        <span className="text-[var(--text-primary)] font-black text-lg">{Math.round(water)} <span className="text-[var(--text-muted)] text-sm font-semibold">/ {waterGoal} ml</span></span>
                      </div>
                      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)" }}>
                        <div className="h-full bg-[#38BDF8] rounded-full transition-all duration-700 ease-out" style={{ width: `${waterPct}%` }} />
                      </div>
                    </div>

                    {/* Small Water SVG ring representation */}
                    <div className="flex justify-center py-4 w-full">
                      <div className="relative w-32 h-32 rounded-full overflow-hidden flex-shrink-0" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)" }}>
                        <svg width="128" height="128" viewBox="0 0 128 128" className="absolute inset-0">
                          <defs>
                            <clipPath id="mini-clip">
                              <circle cx="64" cy="64" r="64" />
                            </clipPath>
                            <linearGradient id="miniWave" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38BDF8" />
                              <stop offset="100%" stopColor="#BAE6FD" />
                            </linearGradient>
                          </defs>
                          <g clipPath="url(#mini-clip)">
                            <g style={{ transform: `translateY(${128 - (waterPct/100)*128}px)`, transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                              <path
                                d="M 0 10 Q 32 -5, 64 10 T 128 10 T 192 10 T 256 10 T 320 10 T 384 10 L 384 150 L 0 150 Z"
                                fill="url(#miniWave)"
                                className="animate-wave"
                                style={{ animationDuration: "2s" }}
                              />
                            </g>
                          </g>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white drop-shadow-md">
                          {Math.round(waterPct)}%
                        </div>
                      </div>
                    </div>

                    <div className="w-full">
                      <h4 className="text-[var(--text-muted)] font-bold text-sm uppercase tracking-wider mb-3">Entries</h4>
                      {!cLog.waterEntries ? (
                        <p className="text-sm text-[var(--text-muted)] font-medium">Loading water…</p>
                      ) : cLog.waterEntries.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] font-medium">No water logged.</p>
                      ) : (
                        <div className="space-y-3 w-full">
                          {cLog.waterEntries.map(entry => (
                            <div key={entry.id} className="rounded-xl p-3 flex items-center justify-between w-full box-border" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)" }}>
                              <div className="flex items-center gap-3">
                                <Droplets className="w-5 h-5 text-[#38BDF8] flex-shrink-0" />
                                <span className="font-bold text-[var(--text-primary)]">+{entry.amountMl} ml</span>
                              </div>
                              <span className="text-xs text-[var(--text-muted)] font-semibold flex-shrink-0">
                                {new Date(entry.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
