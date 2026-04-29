import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Droplets, Utensils, X } from "lucide-react";
import { logsAPI } from "../utils/api";
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
  const [monthLogs, setMonthLogs] = useState([]);
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
    const fetchMonthLogs = async () => {
      try {
        const res = await logsAPI.getMonth(month + 1, year);
        setMonthLogs(res.data.logs || []);
      } catch (error) {
        console.error("Failed to load monthly logs:", error);
      }
    };
    fetchMonthLogs();
  }, [month, year]);

  useEffect(() => {
    if (!selectedDateKey) {
      setSelectedLog(null);
      return;
    }
    const fetchSelectedLog = async () => {
      try {
        const res = await logsAPI.getByDate(selectedDateKey);
        setSelectedLog(res.data.log);
      } catch (error) {
        console.error("Failed to load selected log:", error);
      }
    };
    fetchSelectedLog();
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
        <div className="flex items-center gap-2.5 mb-6 mt-1">
          <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9 calendar-header-icon">
            {/* Calendar Base */}
            <rect x="6" y="10" width="28" height="26" rx="4" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2" />
            
            {/* Top Binder Area */}
            <path d="M6 14 Q6 10 10 10 L30 10 Q34 10 34 14 L34 18 L6 18 Z" fill="#EF4444" />
            
            {/* Binder Rings */}
            <rect x="11" y="6" width="4" height="8" rx="2" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1" className="calendar-ring-1" />
            <rect x="25" y="6" width="4" height="8" rx="2" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1" className="calendar-ring-2" />

            {/* Dates / Lines */}
            <line x1="12" y1="24" x2="24" y2="24" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" className="calendar-line-1" />
            <line x1="12" y1="30" x2="18" y2="30" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" className="calendar-line-2" />

            {/* Animated Checkmark */}
            <g className="calendar-check-pop">
              <circle cx="27" cy="28" r="6" fill="#22C55E" />
              <path d="M24 28 L26 30 L30 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
          <h1 className="text-[22px] font-extrabold" style={{ color: "#1F2937", letterSpacing: "-0.5px" }}>
            Calendar
          </h1>
        </div>

        <div className="card p-4 sm:p-5 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] rounded-[16px] bg-white border border-gray-100 w-full box-border">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 bg-gray-50 flex-shrink-0"
            style={{ color: "#6B7280" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold truncate px-2 text-center flex-1" style={{ color: "#1F2937" }}>{monthNames[month]} {year}</h2>
          <button
            onClick={handleNextMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 bg-gray-50 flex-shrink-0"
            style={{ color: "#6B7280" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-7 gap-1 mb-2 w-full">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-bold py-1 w-full" style={{ color: "#6B7280" }}>{d}</div>
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
                    className="w-full h-full rounded-[12px] flex flex-col items-center justify-center relative transition-all duration-200 active:scale-[0.92] hover:bg-[#F0FDF4] box-border"
                    style={{
                      background: isSelected ? "#16A34A" : "transparent",
                      color: outMonth ? "#D1D5DB" : isSelected ? "#ffffff" : "#1F2937",
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
            <p className="text-sm font-semibold text-gray-500">Start logging to see your progress here 📅</p>
          </div>
        )}
      </div>

      {/* Full viewport centered overlay popup */}
      {isPanelOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 box-border bg-black/50 animate-overlay-fade"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          onClick={() => setSelectedDateKey(null)}
        >
          <div 
            className="bg-white rounded-[24px] w-full max-w-[420px] max-h-[80dvh] flex flex-col overflow-hidden animate-popup-scale shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent clicking modal from closing it
          >
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-100 bg-white">
              <h3 className="text-lg font-black text-gray-900 truncate pr-4">
                {new Date(selectedDateKey + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <button 
                onClick={() => setSelectedDateKey(null)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto w-full box-border">
              {/* Tab Toggles */}
              <div className="p-4 w-full box-border pb-2">
                <div className="flex w-full bg-[#F3F4F6] rounded-[12px] p-1 box-border">
                  <button 
                    onClick={() => setActiveTab("Calories")}
                    className="flex-1 text-center py-2 rounded-[10px] text-sm font-medium transition-all duration-200"
                    style={{ 
                      background: activeTab === "Calories" ? "white" : "transparent",
                      color: activeTab === "Calories" ? "#16A34A" : "#6B7280",
                      boxShadow: activeTab === "Calories" ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
                    }}
                  >
                    <Utensils className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Calories
                  </button>
                  <button 
                    onClick={() => setActiveTab("Water")}
                    className="flex-1 text-center py-2 rounded-[10px] text-sm font-medium transition-all duration-200"
                    style={{ 
                      background: activeTab === "Water" ? "white" : "transparent",
                      color: activeTab === "Water" ? "#38BDF8" : "#6B7280",
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
                  <div className="py-10 flex flex-col items-center justify-center text-center text-gray-400">
                    <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
                    <p className="font-semibold">📭 No data logged for this day</p>
                  </div>
                ) : activeTab === "Calories" ? (
                  <div className="space-y-6 w-full">
                    <div className="w-full">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-gray-500 font-bold text-sm">Total Calories</span>
                        <span className="text-gray-900 font-black text-lg">{Math.round(cals)} <span className="text-gray-400 text-sm font-semibold">/ {calorieGoal} kcal</span></span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#16A34A] rounded-full transition-all duration-700 ease-out" style={{ width: `${calPct}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
                      {[
                        { label: "Protein", val: cLog.totalProteinG, color: "#3B82F6" },
                        { label: "Carbs", val: cLog.totalCarbsG, color: "#F59E0B" },
                        { label: "Fat", val: cLog.totalFatG, color: "#EF4444" }
                      ].map(m => {
                        const max = 150;
                        const mpct = Math.min(((m.val || 0) / max) * 100, 100);
                        return (
                          <div key={m.label} className="bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-100 w-full box-border">
                            <p className="text-[10px] sm:text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">{m.label}</p>
                            <p className="text-sm sm:text-lg font-black text-gray-900 mb-2">{Math.round(m.val || 0)}g</p>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${mpct}%`, background: m.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="w-full">
                      <h4 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-3">Meals</h4>
                      {Object.keys(cLog.groupedMeals || {}).length === 0 ? (
                        <p className="text-sm text-gray-400 font-medium">No meals logged.</p>
                      ) : (
                        <div className="space-y-3 w-full">
                          {Object.entries(cLog.groupedMeals || {}).map(([mealType, items]) => {
                            const section = sections.find(s => s._id === mealType);
                            const sectionName = section ? section.name : "Deleted section";
                            const mealCals = items.reduce((sum, item) => sum + item.calories, 0);
                            return (
                              <div key={mealType} className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100 w-full box-border">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="font-bold text-gray-900 flex items-center gap-1.5">{section ? <span className="inline-flex w-5 h-5"><MealIcon name={section.name} fallbackEmoji={section.icon} /></span> : null}{sectionName}</span>
                                  <span className="text-[#16A34A] font-bold text-sm">{Math.round(mealCals)} kcal</span>
                                </div>
                                <div className="space-y-1.5 w-full">
                                  {items.map(item => (
                                    <div key={item.id} className="flex justify-between text-xs font-medium text-gray-500 w-full truncate">
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
                        <span className="text-gray-500 font-bold text-sm">Total Water</span>
                        <span className="text-gray-900 font-black text-lg">{Math.round(water)} <span className="text-gray-400 text-sm font-semibold">/ {waterGoal} ml</span></span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#38BDF8] rounded-full transition-all duration-700 ease-out" style={{ width: `${waterPct}%` }} />
                      </div>
                    </div>

                    {/* Small Water SVG ring representation */}
                    <div className="flex justify-center py-4 w-full">
                      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-50 shadow-inner border border-gray-100 flex-shrink-0">
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
                                d="M 0 10 Q 32 -5, 64 10 T 128 10 T 192 10 T 256 10 L 256 150 L 0 150 Z"
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
                      <h4 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-3">Entries</h4>
                      {(!cLog.waterEntries || cLog.waterEntries.length === 0) ? (
                        <p className="text-sm text-gray-400 font-medium">No water logged.</p>
                      ) : (
                        <div className="space-y-3 w-full">
                          {cLog.waterEntries.map(entry => (
                            <div key={entry.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between w-full box-border">
                              <div className="flex items-center gap-3">
                                <Droplets className="w-5 h-5 text-[#38BDF8] flex-shrink-0" />
                                <span className="font-bold text-gray-900">+{entry.amountMl} ml</span>
                              </div>
                              <span className="text-xs text-gray-500 font-semibold flex-shrink-0">
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
        </div>
      )}
    </div>
  );
}
