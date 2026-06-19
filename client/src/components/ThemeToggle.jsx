import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`w-11 h-11 rounded-full flex items-center justify-center relative overflow-hidden transition-colors no-spring ${className}`}
      style={{ background: "var(--lg-control-bg)", border: "1px solid var(--lg-control-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)", color: "var(--text-muted)" }}
    >
      <Sun
        className="w-5 h-5 absolute transition-all duration-500"
        style={{
          color: "#f59e0b",
          opacity: isDark ? 0 : 1,
          transform: isDark ? "rotate(90deg) scale(0.3)" : "rotate(0deg) scale(1)",
        }}
      />
      <Moon
        className="w-5 h-5 absolute transition-all duration-500"
        style={{
          color: "#a78bfa",
          opacity: isDark ? 1 : 0,
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.3)",
        }}
      />
    </button>
  );
}
