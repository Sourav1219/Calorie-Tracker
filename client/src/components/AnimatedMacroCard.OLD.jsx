// OLD DESIGN - Backup for easy revert
// To revert: Copy this code back to Dashboard.jsx AnimatedMacroCard function

import { useEffect, useState } from "react";

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

export default AnimatedMacroCard;
