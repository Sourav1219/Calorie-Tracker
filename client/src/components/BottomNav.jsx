import { useRef, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, UtensilsCrossed, Droplets, CalendarDays, User } from "lucide-react";
import { useUser } from "../context/UserContext";

const tabs = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/log", label: "Log", icon: UtensilsCrossed },
  { path: "/water", label: "Water", icon: Droplets },
  { path: "/calendar", label: "Calendar", icon: CalendarDays },
  { path: "/profile", label: "Profile", icon: User, isProfile: true },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useUser();
  const navRef = useRef(null);
  // Pill center-X, relative to the nav container. null until first measure.
  const [pillCenter, setPillCenter] = useState(null);

  const activeIndex = tabs.findIndex((t) => t.path === location.pathname);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || activeIndex < 0) return;

    const measure = () => {
      const btn = nav.querySelectorAll("button")[activeIndex];
      if (!btn) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      // Center the pill on the button's center so it never drifts from the icon.
      setPillCenter(btnRect.left - navRect.left + btnRect.width / 2);
    };

    measure();

    // Re-measure when the nav resizes (orientation change, profile photo load,
    // font swap) so the pill stays locked to the icon instead of lagging behind.
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeIndex]);

  if (!isLoggedIn) return null;

  return (
    <nav
      className="bottom-nav"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        pointerEvents: "none",
        paddingLeft: 14,
        paddingRight: 14,
        paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
      }}
    >
      <div
        ref={navRef}
        className="relative mx-auto flex items-center justify-around"
        style={{
          maxWidth: 400,
          height: 62,
          padding: "0 8px",
          pointerEvents: "auto",
          background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 42%), rgba(255,255,255,0.08)",
          backdropFilter: "blur(24px) saturate(190%)",
          WebkitBackdropFilter: "blur(24px) saturate(190%)",
          border: "1px solid var(--lg-border)",
          borderRadius: 32,
          boxShadow:
            "0 14px 34px var(--lg-shadow-strong), 0 3px 10px var(--lg-shadow), inset 0 1px 0 0 var(--lg-hl-top), inset 0 -1px 1px 0 var(--lg-hl-bottom)",
        }}
      >
        {/* Sliding pill — centered on the active icon, CSS transition */}
        {activeIndex >= 0 && pillCenter !== null && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: pillCenter,
              width: 58,
              height: 46,
              borderRadius: 9999,
              background: "linear-gradient(180deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))",
              border: "1px solid var(--green-border)",
              boxShadow: "0 3px 12px rgba(34,197,94,0.22), inset 0 1px 0 rgba(255,255,255,0.35)",
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
              transition: "left 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              willChange: "left",
            }}
          />
        )}

        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              id={`nav-tab-${tab.label.toLowerCase()}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              className="relative flex items-center justify-center active:scale-90 transition-transform duration-200"
              style={{ width: 58, height: 46 }}
            >
              {tab.isProfile && user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt="Profile"
                  className="relative z-10 w-7 h-7 rounded-full object-cover transition-all duration-300"
                  style={{
                    opacity: isActive ? 1 : 0.7,
                    boxShadow: isActive
                      ? "0 0 0 2px var(--glass-nav-bg), 0 0 0 3.5px var(--green-primary)"
                      : "none",
                  }}
                />
              ) : (
                <Icon
                  className={`relative z-10 transition-all duration-300 ${isActive ? "animate-pop" : ""}`}
                  style={{
                    width: 24,
                    height: 24,
                    color: isActive ? "var(--green-primary)" : "var(--text-muted)",
                    filter: isActive ? "drop-shadow(0 1px 3px rgba(34,197,94,0.4))" : "none",
                  }}
                  strokeWidth={isActive ? 2.4 : 2}
                  fill="none"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
