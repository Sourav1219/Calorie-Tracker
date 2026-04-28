import { useLocation, useNavigate } from "react-router-dom";
import { Home, UtensilsCrossed, Droplets, CalendarDays, User } from "lucide-react";
import { useUser } from "../context/UserContext";

const tabs = [
  { path: "/dashboard", label: "Home", icon: Home, activeColor: "var(--green-primary)", subtleBg: "var(--green-subtle)" },
  { path: "/log", label: "Log", icon: UtensilsCrossed, activeColor: "var(--green-primary)", subtleBg: "var(--green-subtle)" },
  { path: "/water", label: "Water", icon: Droplets, activeColor: "var(--blue-primary)", subtleBg: "var(--blue-subtle)" },
  { path: "/calendar", label: "Calendar", icon: CalendarDays, activeColor: "var(--green-primary)", subtleBg: "var(--green-subtle)" },
  { path: "/profile", label: "Profile", icon: User, activeColor: "var(--green-primary)", subtleBg: "var(--green-subtle)" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useUser();

  // Only render when authenticated
  if (!isLoggedIn) return null;

  return (
    <nav
      className="bottom-nav relative z-50 flex-shrink-0"
      style={{
        background: "rgba(255,255,255,0.92)",
        borderTop: "1px solid var(--border-default)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              id={`nav-tab-${tab.label.toLowerCase()}`}
              onClick={() => navigate(tab.path)}
              className="group relative flex flex-col items-center justify-center w-[60px] h-14 min-h-[44px] rounded-2xl transition-all duration-300 active:scale-95"
            >
              <div className="relative flex items-center justify-center w-8 h-8 mb-0.5">
                {/* Hover bubble background */}
                {!isActive && (
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" 
                    style={{ background: tab.subtleBg }} 
                  />
                )}
                <Icon
                  className={`relative z-10 w-5 h-5 transition-all duration-300 ${isActive ? "animate-pop" : "nav-icon-float"}`}
                  style={{ 
                    color: isActive ? tab.activeColor : "var(--text-muted)"
                  }}
                  fill={isActive ? "currentColor" : "none"}
                />
              </div>
              <span
                className="text-[10px] transition-all duration-300"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? tab.activeColor : "var(--text-muted)",
                  transform: isActive ? "translateY(0)" : "translateY(1px)",
                  opacity: isActive ? 1 : 0.7
                }}
              >
                {tab.label}
              </span>
              
              {/* Active Indicator Dot */}
              {isActive && (
                <div 
                  className="absolute bottom-0 w-1 h-1 rounded-full animate-fade-in" 
                  style={{ background: tab.activeColor }} 
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
