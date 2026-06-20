import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useNotifications } from "../context/NotificationContext";
import { Link, useLocation } from "react-router-dom";
import { Bell, X, Flame, Droplets, Target, UtensilsCrossed, BarChart3, Home, CalendarDays, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import BrandMark from "./BrandMark";

const NOTIFICATION_STYLES = {
  meal: { icon: UtensilsCrossed, color: "#d97706", bg: "#FEF3C7" },
  water: { icon: Droplets, color: "#2563eb", bg: "#EFF6FF" },
  streak: { icon: Flame, color: "#dc2626", bg: "#FEF2F2" },
  goal: { icon: Target, color: "#16a34a", bg: "#F0FDF4" },
  summary: { icon: BarChart3, color: "#7c3aed", bg: "#F5F3FF" }
};

const desktopTabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/log", label: "Log", icon: UtensilsCrossed },
  { path: "/water", label: "Water", icon: Droplets },
  { path: "/calendar", label: "Calendar", icon: CalendarDays },
  { path: "/profile", label: "Profile", icon: User },
];

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // fallback if already a string like "2 min ago"
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHrs < 24) return `${diffHrs} hr ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export default function Navbar() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    hasNew 
  } = useNotifications();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const panelRef = useRef(null);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "?";

  const buttonRef = useRef(null);
  const panelContentRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isPanelOpen && 
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        (!panelContentRef.current || !panelContentRef.current.contains(event.target))
      ) {
        setIsPanelOpen(false);
      }
    };
    if (isPanelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPanelOpen]);

  const togglePanel = (e) => {
    e.stopPropagation();
    if (!isPanelOpen) {
      setIsRinging(true);
      setTimeout(() => setIsRinging(false), 400);
    }
    setIsPanelOpen(!isPanelOpen);
  };

  const filteredNotifications = notifications.filter(n => 
    filter === "all" ? true : !n.read
  );

  return (
    <nav
      className="relative z-50 flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, var(--lg-sheen), transparent 60%), var(--nav-surface)",
        backdropFilter: "blur(18px) saturate(180%)",
        WebkitBackdropFilter: "blur(18px) saturate(180%)",
        borderBottom: "1px solid var(--lg-border)",
        boxShadow: "inset 0 1px 0 0 var(--lg-hl-top)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="max-w-lg md:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between relative">
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="flex flex-col">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{today}</span>
              <span className="text-sm font-bold font-display leading-tight" style={{ color: "var(--text-primary)" }}>
                PureIntake
              </span>
            </span>
          </Link>
        </div>

        {/* Mobile Navigation hidden on desktop? No, we remove the desktop navigation completely! */}

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <ThemeToggle />

          {/* Notification Bell */}
          <div ref={buttonRef}>
            <button
              onClick={togglePanel}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              className="bell-button-group w-11 h-11 rounded-full flex items-center justify-center transition-colors relative no-spring"
              style={{ background: "var(--lg-control-bg)", border: "1px solid var(--lg-control-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)", color: "var(--text-muted)" }}
            >
              <Bell 
                className={`bell-icon w-5 h-5 ${(hasNew || isRinging) ? 'animate-bell-shake' : ''}`} 
                style={{ color: unreadCount > 0 ? "var(--green-primary)" : "var(--text-muted)" }}
              />
              {unreadCount > 0 && (
                <div className={`notification-badge ${hasNew ? 'animate-badge-pop' : ''}`}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </button>
          </div>

          {/* Profile Avatar */}
          <button
            id="navbar-avatar"
            onClick={() => navigate("/profile")}
            aria-label="Open profile"
            className="glass-green w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-[1.05] active:scale-95 overflow-hidden no-spring"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              userInitial
            )}
          </button>
        </div>

        {/* Notification Panel */}
        {isPanelOpen && (
          <div ref={panelContentRef} className="notification-panel animate-panel-slide-down">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--lg-border)" }}>
                  <h3 className="font-bold text-[18px]" style={{ color: "var(--text-primary)" }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                      className="text-[13px] font-semibold text-green-600 hover:text-green-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-3 border-b" style={{ borderColor: "var(--lg-border)", background: "var(--lg-tint)" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFilter("all"); }}
                    className="px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                    style={filter === "all"
                      ? { background: "var(--green-subtle)", color: "var(--green-text)" }
                      : { background: "transparent", color: "var(--text-muted)" }}
                  >
                    All
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFilter("unread"); }}
                    className="px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                    style={filter === "unread"
                      ? { background: "var(--green-subtle)", color: "var(--green-text)" }
                      : { background: "transparent", color: "var(--text-muted)" }}
                  >
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                  </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto max-h-[50vh]" style={{ background: "transparent" }}>
                  {filteredNotifications.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center">
                      <Bell className="w-8 h-8 mb-2" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                      <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No notifications here</p>
                    </div>
                  ) : (
                    filteredNotifications.map(n => {
                      const style = NOTIFICATION_STYLES[n.type] || NOTIFICATION_STYLES.summary;
                      const Icon = style.icon;
                      
                      return (
                        <div
                          key={n.id}
                          onClick={() => !n.read && markAsRead(n.id)}
                          className="relative flex items-start gap-3 p-4 border-b transition-colors group"
                          style={{
                            borderColor: "var(--divider)",
                            background: !n.read ? "var(--green-subtle)" : "transparent",
                            cursor: !n.read ? "pointer" : "default",
                          }}
                        >
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: style.bg, color: style.color }}
                          >
                            <Icon size={18} />
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-6">
                            <h4 className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                              {n.title}
                            </h4>
                            <p className="text-[13px] mt-0.5 leading-snug" style={{ color: "var(--text-secondary)" }}>
                              {n.message}
                            </p>
                            <p className="text-[11px] mt-1 font-medium" style={{ color: "var(--text-muted)" }}>
                              {formatTimeAgo(n.time)}
                            </p>
                          </div>

                          {!n.read && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                            className="absolute right-2 top-2 p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all sm:opacity-100 sm:bg-transparent no-spring"
                            style={{ color: "var(--text-muted)" }}
                            aria-label="Remove notification"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
      </div>
    </nav>
  );
}
