import { useEffect, useMemo, useState } from "react";

export default function CalorieRing({ consumed = 0, goal = 2000, size = 160 }) {
  const strokeWidth = 12;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  const [dashOffset, setDashOffset] = useState(circumference);
  const [displayConsumed, setDisplayConsumed] = useState(0);

  const safeGoal = Math.max(goal, 1);
  const pct = consumed / safeGoal;
  const boundedPct = Math.min(pct, 1);
  const remaining = Math.max(goal - consumed, 0);

  useEffect(() => {
    let startTime;
    const duration = 1000;
    const target = consumed;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const pctTime = Math.min(progress / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - pctTime, 3);
      setDisplayConsumed(Math.round(target * easeOut));

      if (progress < duration) {
        requestAnimationFrame(step);
      } else {
        setDisplayConsumed(target);
      }
    };

    requestAnimationFrame(step);
  }, [consumed]);

  const trackColor = "var(--border-default)";

  const progressColor = useMemo(() => {
    if (pct >= 1) return "var(--green-primary)";
    if (pct >= 0.8) return "var(--green-primary)"; // or a different shade if you prefer
    if (pct >= 0.4) return "#f97316";
    return "#ef4444";
  }, [pct]);

  useEffect(() => {
    const targetOffset = circumference * (1 - boundedPct);
    const t = setTimeout(() => {
      setDashOffset(targetOffset);
    }, 150);

    return () => clearTimeout(t);
  }, [circumference, boundedPct]);

  return (
    <div className={`relative flex items-center justify-center transition-all ${pct >= 1 ? 'animate-goal-pulse' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
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
          stroke={progressColor}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.2, 0.64, 1), stroke 1s ease" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-4xl font-bold" style={{ color: "var(--text-primary)", transition: "color 1s ease" }}>
          {displayConsumed}
        </p>
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
