import { useEffect, useMemo, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

export default function CalorieRing({ consumed = 0, goal = 2000, size = 160 }) {
  const strokeWidth = 12;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const [dashOffset, setDashOffset] = useState(circumference);

  const safeGoal = Math.max(goal, 1);
  const pct = consumed / safeGoal;
  const boundedPct = Math.min(pct, 1);
  const remaining = Math.max(goal - consumed, 0);

  const trackColor = "var(--divider)";

  // Unique gradient id so multiple rings on a page don't collide
  const gradientId = useMemo(() => `calorie-ring-grad-${Math.random().toString(36).slice(2, 9)}`, []);

  // Gradient color stops shift with progress (red → orange → green→teal)
  const gradientStops = useMemo(() => {
    if (pct >= 0.8) return ["#22c55e", "#14b8a6"];   // green → teal
    if (pct >= 0.4) return ["#f97316", "#facc15"];   // orange → amber
    return ["#ef4444", "#f97316"];                    // red → orange
  }, [pct]);

  // Solid fallback color used for the text/labels
  const progressColor = useMemo(() => {
    if (pct >= 0.8) return "var(--green-primary)";
    if (pct >= 0.4) return "#f97316";
    return "#ef4444";
  }, [pct]);

  // Glow on the circular wrapper div — drop-shadow on SVG bleeds as a square box
  const glowShadow = useMemo(() => {
    if (pct >= 1) return `0 0 32px ${gradientStops[0]}99, 0 0 12px ${gradientStops[0]}55`;
    if (pct >= 0.8) return `0 0 16px ${gradientStops[0]}55`;
    return "none";
  }, [pct, gradientStops]);

  useEffect(() => {
    const targetOffset = circumference * (1 - boundedPct);
    const t = setTimeout(() => {
      setDashOffset(targetOffset);
    }, 150);

    return () => clearTimeout(t);
  }, [circumference, boundedPct]);

  return (
    <div className={`relative flex items-center justify-center transition-all ${pct >= 1 ? 'animate-goal-pulse' : ''}`} style={{ width: size, height: size, borderRadius: "50%", boxShadow: glowShadow, transition: "box-shadow 0.6s ease" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStops[0]} style={{ transition: "stop-color 1s ease" }} />
            <stop offset="100%" stopColor={gradientStops[1]} style={{ transition: "stop-color 1s ease" }} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.2, 0.64, 1)",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <AnimatedNumber
          value={consumed}
          className="text-4xl font-bold font-display"
          style={{ color: "var(--text-primary)", transition: "color 1s ease" }}
        />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          of {goal} kcal
        </p>
        
        <div className="flex items-center gap-1 justify-center mt-1 animate-fade-in">
          {pct >= 0.8 && (
            <span 
              className={`text-[14px] leading-none ${pct >= 1 ? "animate-pulse drop-shadow-[0_0_8px_rgba(255,140,0,0.8)]" : "opacity-70"}`}
            >
              🔥
            </span>
          )}
          <p 
            className="text-[12px] font-bold tracking-wide" 
            style={{ color: progressColor, transition: "color 1s ease" }}
          >
            {remaining <= 0 ? (
              "GOAL MET"
            ) : (
              `${remaining} LEFT`
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
