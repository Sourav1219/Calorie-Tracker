import { useEffect, useState } from "react";
import { Droplets, Minus, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "../context/UserContext";
import { waterAPI, getLocalDateKey } from "../utils/api";
import { getCache, setCache, hasCache } from "../utils/pageCache";
import AnimatedNumber from "../components/AnimatedNumber";

export default function WaterTracker() {
  const { user } = useUser();
  // Seed from the per-session cache so revisiting this tab shows the filled
  // glass + entries instantly instead of re-filling from empty.
  const cacheKey = `water:${getLocalDateKey(new Date())}`;
  const cached = getCache(cacheKey);
  // Start empty so the liquid fill + count-up animate in on every visit, but
  // seed the entries list from cache so the page itself never reloads/blanks.
  const [totalWater, setTotalWater] = useState(0);
  const [entries, setEntries] = useState(() => cached?.entries ?? []);
  const [customAmount, setCustomAmount] = useState(100);
  const [isLoading, setIsLoading] = useState(() => !hasCache(cacheKey));

  // Animate the fill up to the last-known amount right away (before the network
  // round-trip), so the water animation plays instantly on every revisit.
  useEffect(() => {
    if (cached) setTotalWater(cached.totalWater || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation states
  const [deletingIds, setDeletingIds] = useState([]);
  const [particles, setParticles] = useState([]);

  const waterGoal = user?.dailyWaterGoalMl || 2500;
  const progress = Math.min((totalWater / waterGoal) * 100, 100);

  // Background refresh on mount — never flips back to the skeleton or resets the
  // fill to zero; it just reconciles the cached figures with the server.
  useEffect(() => {
    let active = true;
    const fetchWater = async () => {
      try {
        const res = await waterAPI.getToday();
        if (!active) return;
        setTotalWater(res.data.totalWaterMl || 0);
        setEntries(res.data.entries || []);
      } catch (error) {
        if (active) toast.error(error.response?.data?.error || "Failed to load water data");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchWater();
    return () => { active = false; };
  }, []);

  // Keep the cache current (incl. optimistic add/remove) so the next visit is instant.
  useEffect(() => {
    setCache(cacheKey, { totalWater, entries });
  }, [cacheKey, totalWater, entries]);

  const triggerParticles = () => {
    const newParticles = Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 80,
      y: -Math.random() * 80 - 40,
      scale: Math.random() * 0.4 + 0.6
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter(p => !newParticles.includes(p)));
    }, 1000);
  };

  const addWater = async (amount) => {
    if (!amount || amount <= 0) return;
    
    // Optimistic UI Update
    const tempId = Date.now().toString();
    const optimisticEntry = {
      id: tempId,
      amountMl: amount,
      loggedAt: new Date().toISOString(),
      isNew: true
    };
    
    setEntries((current) => [optimisticEntry, ...current]);
    const prevTotal = totalWater;
    setTotalWater(prevTotal + amount);
    triggerParticles();

    // Remove isNew after animation
    setTimeout(() => {
      setEntries(curr => curr.map(e => e.id === tempId ? { ...e, isNew: false } : e));
    }, 400);

    try {
      const res = await waterAPI.create({ amountMl: amount });
      // Replace optimistic entry with actual data
      setEntries(curr => curr.map(e => e.id === tempId ? { ...res.data.entry, isNew: false } : e));
    } catch (error) {
      // Revert optimistic update
      setEntries(curr => curr.filter(e => e.id !== tempId));
      setTotalWater(prevTotal);
      toast.error(error.response?.data?.error || "Failed to log water");
    }
  };

  const removeWater = async (entryId, amountMl) => {
    try {
      // Trigger slide out animation first
      setDeletingIds(curr => [...curr, entryId]);
      
      // Wait for animation to finish before actual deletion
      setTimeout(async () => {
        try {
          await waterAPI.remove(entryId);
          setEntries((current) => current.filter((entry) => entry.id !== entryId));
          setTotalWater((prev) => Math.max(0, prev - amountMl));
          setDeletingIds(curr => curr.filter(id => id !== entryId));
        } catch (error) {
          toast.error("Failed to delete water entry");
          setDeletingIds(curr => curr.filter(id => id !== entryId));
        }
      }, 350); // Matches CSS animation duration
      
    } catch (error) {
      console.error(error);
    }
  };

  const quickAmounts = [100, 200, 250, 500];
  
  // Dynamic color for text inside the circle
  const textFillColor = progress > 55 ? "#ffffff" : "var(--text-primary)";
  const subTextFillColor = progress > 55 ? "rgba(255,255,255,0.8)" : "var(--text-muted)";
  
  // SVG size setup
  const size = 220;
  
  // Math for the Y position of the wave (100% full = top of circle, 0% = bottom)
  const fillHeight = (progress / 100) * size;
  const waveTranslateY = size - fillHeight;

  // Dynamic Color Interpolation (Light Sky Blue -> Deep Sky Blue)
  const calculateColor = (startRGB, endRGB, percent) => {
    const r = Math.round(startRGB[0] + (endRGB[0] - startRGB[0]) * percent);
    const g = Math.round(startRGB[1] + (endRGB[1] - startRGB[1]) * percent);
    const b = Math.round(startRGB[2] + (endRGB[2] - startRGB[2]) * percent);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const pct = Math.min(progress / 100, 1);
  const currentTopColor = calculateColor([186, 230, 253], [14, 165, 233], pct); // #BAE6FD -> #0EA5E9
  const currentBottomColor = calculateColor([224, 242, 254], [56, 189, 248], pct); // #E0F2FE -> #38BDF8

  const isGoalReached = progress >= 100;

  return (
    <div className="page-container" style={{ background: "var(--bg-page)" }}>
      
      <div className="flex items-center gap-3 mb-6 mt-1">
        <div className="glass-blue w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Droplets className="w-[22px] h-[22px]" style={{ color: "#0ea5e9" }} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-[22px] font-extrabold font-display leading-none" style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            Water Tracker
          </h1>
          <span className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            Stay hydrated today
          </span>
        </div>
      </div>

      {/* Progress Card */}
      <div className="card text-center mb-6 p-8">

        {/* Liquid Fill SVG */}
        <div
          className="relative mx-auto mb-6 flex justify-center overflow-hidden rounded-full transition-all duration-1000"
          style={{
            width: size, height: size,
            background: "linear-gradient(145deg, rgba(186,230,253,0.35) 0%, rgba(224,242,254,0.20) 60%, rgba(186,230,253,0.28) 100%)",
            border: isGoalReached ? "1px solid rgba(14,165,233,0.50)" : "1px solid rgba(14,165,233,0.22)",
            boxShadow: isGoalReached
              ? "0 0 28px rgba(14,165,233,0.55), 0 0 70px rgba(56,189,248,0.25), 0 0 110px rgba(14,165,233,0.10), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -1px 0 rgba(14,165,233,0.08)"
              : "0 4px 24px rgba(14,165,233,0.10), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -1px 0 rgba(14,165,233,0.08)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none">
            <defs>
              <clipPath id="circle-clip">
                <circle cx={size / 2} cy={size / 2} r={size / 2} />
              </clipPath>
              <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentTopColor} style={{ transition: "stop-color 1s ease" }} />
                <stop offset="100%" stopColor={currentBottomColor} style={{ transition: "stop-color 1s ease" }} />
              </linearGradient>
            </defs>
            
            {/* The rising liquid container */}
            <g clipPath="url(#circle-clip)">
              <g 
                style={{ 
                  transform: `translateY(${waveTranslateY}px)`, 
                  transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)" 
                }}
              >
                {/* 
                  Continuous Sine Wave Path: 
                  Width is 440 (2x size), allowing seamless scroll from 0 to -220 
                */}
                <path 
                  d="M 0 15 Q 55 -5, 110 15 T 220 15 T 330 15 T 440 15 L 440 250 L 0 250 Z"
                  fill="url(#waveGradient)"
                  className="animate-wave"
                />
              </g>
            </g>
          </svg>

          {/* Splash Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute left-1/2 top-[40%] pointer-events-none animate-splash z-20"
              style={{
                "--tx": `${p.x}px`,
                "--ty": `${p.y}px`,
                transform: `translate(-50%, -50%) scale(${p.scale})`,
                color: "#38BDF8"
              }}
            >
              <Droplets className="w-5 h-5 fill-current" />
            </div>
          ))}

          {/* Overlay Text (Dynamic Color) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2 z-10 transition-colors duration-500">
            <Droplets className="w-8 h-8 mx-auto mb-1 transition-colors duration-500" style={{ color: textFillColor }} />
            <AnimatedNumber
              value={totalWater}
              className="text-4xl font-black tabular-nums tracking-tight transition-colors duration-500 font-display"
              style={{ color: textFillColor }}
            />
            <p className="text-sm font-semibold transition-colors duration-500 mt-0.5" style={{ color: subTextFillColor }}>
              / {waterGoal} ml
            </p>
          </div>
        </div>

        {/* Progress Bar & Label */}
        <div className="w-full flex items-center justify-between mb-2">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Daily Progress</p>
          <p className="text-sm font-bold" style={{ color: "#0EA5E9" }}>{Math.round(progress)}%</p>
        </div>

        {/* Liquid Glass Progress Bar */}
        <div
          className="w-full h-[18px] rounded-full relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(186,230,253,0.40) 0%, rgba(224,242,254,0.25) 100%)",
            border: "1px solid rgba(14,165,233,0.20)",
            boxShadow: isGoalReached
              ? "inset 0 2px 4px rgba(14,165,233,0.12), 0 0 14px rgba(14,165,233,0.30), inset 0 1px 0 rgba(255,255,255,0.60)"
              : "inset 0 2px 4px rgba(14,165,233,0.08), inset 0 1px 0 rgba(255,255,255,0.60)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            transition: "box-shadow 600ms ease"
          }}
        >
          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
            style={{
              width: `${progress}%`,
              background: isGoalReached
                ? "linear-gradient(90deg, #38BDF8 0%, #0EA5E9 50%, #0284C7 100%)"
                : "linear-gradient(90deg, #7DD3FC 0%, #38BDF8 55%, #0EA5E9 100%)",
              transition: "width 800ms cubic-bezier(0.34,1.56,0.64,1), background 600ms ease"
            }}
          >
            {/* Glass sheen — top half bright highlight */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.06) 50%, transparent 100%)"
              }}
            />
            {/* Subtle bottom rim glow */}
            <div
              className="absolute inset-x-0 bottom-0 h-[3px] pointer-events-none"
              style={{ background: "rgba(255,255,255,0.18)" }}
            />
          </div>

          {/* Track top specular edge */}
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{ background: "var(--lg-hl-top)", zIndex: 2 }}
          />
        </div>
      </div>

      {/* Quick Add Buttons */}
      <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Quick Add</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            onClick={() => addWater(amount)}
            className="glass-blue py-3.5 rounded-full text-sm font-bold transition-all duration-150 active:scale-[0.92] btn-spring flex justify-center items-center gap-1.5"
          >
            <Droplets className="w-4 h-4" /> +{amount}ml
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="card p-4 flex items-center justify-between mb-8">
        <button
          onClick={() => setCustomAmount((prev) => Math.max(50, prev - 50))}
          className="glass-blue w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-[0.92] btn-spring"
        >
          <Minus className="w-6 h-6" />
        </button>
        <button
          onClick={() => addWater(customAmount)}
          className="glass-blue font-black text-lg px-6 py-2.5 rounded-2xl transition-all duration-150 active:scale-[0.96] btn-spring flex items-center gap-2"
        >
          Add {customAmount} ml
        </button>
        <button
          onClick={() => setCustomAmount((prev) => prev + 50)}
          className="glass-blue w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-[0.92] btn-spring"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Entries List */}
      <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Today&apos;s Entries</h2>
      {isLoading ? (
        <div className="card text-center py-8" style={{ color: "var(--text-muted)" }}>Loading water entries...</div>
      ) : entries.length === 0 ? (
        <div
          className="rounded-2xl text-center py-10 px-4"
          style={{
            background: "linear-gradient(145deg, rgba(186,230,253,0.28) 0%, rgba(224,242,254,0.15) 60%, rgba(186,230,253,0.22) 100%)",
            border: "1px solid rgba(14,165,233,0.18)",
            boxShadow: "0 4px 20px rgba(14,165,233,0.08), inset 0 1px 0 rgba(255,255,255,0.65)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "linear-gradient(180deg, rgba(56,189,248,0.22), rgba(14,165,233,0.10))",
              border: "1px solid rgba(14,165,233,0.25)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <Droplets className="w-7 h-7" style={{ color: "#0ea5e9" }} />
          </div>
          <p className="font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>No entries yet today</p>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Tap a quick-add button above to start your hydration journey</p>
        </div>
      ) : (
        <div className="space-y-3 relative z-10 overflow-hidden pb-10">
          {entries.map((entry) => {
            const isDeleting = deletingIds.includes(entry.id);
            const isNew = entry.isNew;
            
            return (
              <div
                key={entry.id}
                className={`p-4 flex items-center justify-between gap-3 rounded-2xl ${isDeleting ? 'animate-slide-out-left' : isNew ? 'animate-slide-in-right' : ''}`}
                style={{
                  background: "linear-gradient(145deg, rgba(186,230,253,0.22) 0%, rgba(224,242,254,0.12) 100%)",
                  border: "1px solid rgba(14,165,233,0.16)",
                  borderLeft: "3px solid rgba(14,165,233,0.55)",
                  boxShadow: "0 2px 12px rgba(14,165,233,0.07), inset 0 1px 0 rgba(255,255,255,0.55)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <div className="flex items-center gap-4">
                  <Droplets className="w-6 h-6" style={{ color: "#38BDF8" }} />
                  <div>
                    <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>+{entry.amountMl} ml</p>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                      {new Date(entry.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeWater(entry.id, entry.amountMl)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: "linear-gradient(180deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.07) 100%)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                    color: "#EF4444",
                  }}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
