import { useEffect, useRef, useState } from "react";
import { Droplets, Minus, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "../context/UserContext";
import { waterAPI } from "../utils/api";

export default function WaterTracker() {
  const { user } = useUser();
  const [totalWater, setTotalWater] = useState(0);
  const [displayWater, setDisplayWater] = useState(0);
  const [entries, setEntries] = useState([]);
  const [customAmount, setCustomAmount] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation states
  const [deletingIds, setDeletingIds] = useState([]);
  const [particles, setParticles] = useState([]);
  const animStartRef = useRef(0);
  const animFrameRef = useRef(null);

  const waterGoal = user?.dailyWaterGoalMl || 2500;
  const progress = Math.min((totalWater / waterGoal) * 100, 100);

  // Animate Number Count Up — fixed: only depends on totalWater, uses ref for start value
  useEffect(() => {
    const duration = 600;
    const target = totalWater;
    const start = animStartRef.current;

    if (target === start) return;

    // Cancel any running animation
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progressTime = timestamp - startTime;
      const pctTime = Math.min(progressTime / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - pctTime, 3);
      const current = Math.round(start + (target - start) * easeOut);
      setDisplayWater(current);

      if (progressTime < duration) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayWater(target);
        animStartRef.current = target;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [totalWater]);

  useEffect(() => {
    const fetchWater = async () => {
      try {
        setIsLoading(true);
        const res = await waterAPI.getToday();
        const initialWater = res.data.totalWaterMl || 0;
        animStartRef.current = 0; // start animation from 0
        setTotalWater(initialWater);
        setDisplayWater(0);
        setEntries(res.data.entries || []);
      } catch (error) {
        toast.error(error.response?.data?.error || "Failed to load water data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWater();
  }, []);

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
  const textFillColor = progress > 55 ? "#ffffff" : "#1F2937";
  const subTextFillColor = progress > 55 ? "rgba(255,255,255,0.8)" : "#6B7280";
  
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
      
      <div className="flex items-center gap-2.5 mb-6">
        <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9 water-tracker-header-icon">
          {/* Ripple/Splash Base */}
          <ellipse cx="20" cy="32" rx="14" ry="4" stroke="#38BDF8" strokeWidth="2" opacity="0.3" className="water-ripple-1"/>
          <ellipse cx="20" cy="32" rx="8" ry="2.5" stroke="#0EA5E9" strokeWidth="2" opacity="0.5" className="water-ripple-2"/>
          
          {/* Floating Water Drop */}
          <g className="floating-drop">
            <path d="M20 14 C20 14 14 22 14 26 C14 29.5 16.5 32 20 32 C23.5 32 26 29.5 26 26 C26 22 20 14 20 14 Z" fill="#0EA5E9"/>
            {/* Highlight */}
            <path d="M17 26 C17 24 18 22 20 20" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
          </g>
          
          {/* Little splash droplets */}
          <circle cx="12" cy="26" r="1.5" fill="#38BDF8" className="water-splash-1" opacity="0"/>
          <circle cx="28" cy="24" r="2" fill="#0EA5E9" className="water-splash-2" opacity="0"/>
        </svg>
        <h1 className="text-[22px] font-extrabold" style={{ color: "#1F2937", letterSpacing: "-0.5px" }}>
          Water Tracker
        </h1>
      </div>

      {/* Progress Card */}
      <div className="card text-center mb-6 p-8 shadow-sm border border-gray-100">
        
        {/* Liquid Fill SVG */}
        <div 
          className={`relative mx-auto mb-6 flex justify-center overflow-hidden rounded-full transition-all duration-1000 ${isGoalReached ? 'ring-4 ring-offset-4 ring-[#0EA5E9] shadow-[0_0_30px_rgba(14,165,233,0.4)]' : ''}`} 
          style={{ width: size, height: size, background: "#F3F4F6" }}
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
            <p className="text-4xl font-black tabular-nums tracking-tight transition-colors duration-500" style={{ color: textFillColor }}>
              {displayWater}
            </p>
            <p className="text-sm font-semibold transition-colors duration-500 mt-0.5" style={{ color: subTextFillColor }}>
              / {waterGoal} ml
            </p>
          </div>
        </div>

        {/* Progress Bar & Label */}
        <div className="w-full flex items-center justify-between mb-2">
          <p className="text-sm font-bold" style={{ color: "#1F2937" }}>Daily Progress</p>
          <p className="text-sm font-bold" style={{ color: "#0EA5E9" }}>{Math.round(progress)}%</p>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${progress}%`, 
              background: "linear-gradient(90deg, #7DD3FC, #0EA5E9)",
              transitionDuration: "800ms",
              transitionTimingFunction: "ease-out"
            }}
          />
        </div>
      </div>

      {/* Quick Add Buttons */}
      <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: "#6B7280" }}>Quick Add</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            onClick={() => addWater(amount)}
            className="py-3.5 rounded-full text-sm font-bold shadow-sm transition-all duration-150 active:scale-[0.92] btn-spring flex justify-center items-center gap-1.5"
            style={{
              background: "#EFF6FF",
              color: "#2563EB",
            }}
          >
            <Droplets className="w-4 h-4" /> +{amount}ml
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="card p-4 flex items-center justify-between mb-8 shadow-sm border border-gray-100">
        <button
          onClick={() => setCustomAmount((prev) => Math.max(50, prev - 50))}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-[0.92] btn-spring"
          style={{ background: "#EFF6FF", color: "#2563EB" }}
        >
          <Minus className="w-6 h-6" />
        </button>
        <button
          onClick={() => addWater(customAmount)}
          className="font-black text-lg px-6 py-2.5 rounded-2xl transition-all duration-150 active:scale-[0.96] btn-spring flex items-center gap-2"
          style={{ color: "#1F2937", background: "transparent" }}
        >
          Add {customAmount} ml
        </button>
        <button
          onClick={() => setCustomAmount((prev) => prev + 50)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-[0.92] btn-spring"
          style={{ background: "#EFF6FF", color: "#2563EB" }}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Entries List */}
      <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: "#6B7280" }}>Today&apos;s Entries</h2>
      {isLoading ? (
        <div className="card text-center py-8" style={{ color: "#6B7280" }}>Loading water entries...</div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-10 shadow-sm border border-gray-100">
          <Droplets className="w-8 h-8 mx-auto mb-3" style={{ color: "#9CA3AF" }} />
          <p className="font-semibold text-sm" style={{ color: "#6B7280" }}>Start your hydration journey 💧</p>
        </div>
      ) : (
        <div className="space-y-3 relative z-10 overflow-hidden pb-10">
          {entries.map((entry) => {
            const isDeleting = deletingIds.includes(entry.id);
            const isNew = entry.isNew;
            
            return (
              <div 
                key={entry.id} 
                className={`card p-4 flex items-center justify-between gap-3 shadow-sm border border-gray-100 bg-white border-l-[4px] ${isDeleting ? 'animate-slide-out-left' : isNew ? 'animate-slide-in-right' : ''}`} 
                style={{ borderLeftColor: "#38BDF8" }}
              >
                <div className="flex items-center gap-4">
                  <Droplets className="w-6 h-6" style={{ color: "#38BDF8" }} />
                  <div>
                    <p className="font-bold text-base" style={{ color: "#1F2937" }}>+{entry.amountMl} ml</p>
                    <p className="text-xs font-semibold" style={{ color: "#6B7280" }}>
                      {new Date(entry.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeWater(entry.id, entry.amountMl)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-red-50 active:scale-90"
                  style={{ color: "#EF4444" }}
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
