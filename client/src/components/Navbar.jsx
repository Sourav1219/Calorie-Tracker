import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useNotifications } from "../context/NotificationContext";
import { Link, useLocation } from "react-router-dom";
import { Bell, X, Flame, Droplets, Target, UtensilsCrossed, BarChart3, Home, CalendarDays, User } from "lucide-react";

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
      className="relative z-50 backdrop-blur-lg flex-shrink-0"
      style={{
        background: "rgba(249, 250, 251, 0.8)",
        borderBottom: "1px solid var(--border-default)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="max-w-lg md:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between relative">
        <div className="flex items-center">
          <Link to="/dashboard" className="flex flex-col">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{today}</p>
            <h2 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              🥗 PureIntake
            </h2>
          </Link>
        </div>

        {/* Mobile Navigation hidden on desktop? No, we remove the desktop navigation completely! */}

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div ref={buttonRef}>
            <button
              onClick={togglePanel}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-colors relative"
              style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
            >
              <Bell 
                className={`w-5 h-5 ${(hasNew || isRinging) ? 'animate-bell-shake' : ''}`} 
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
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 active:scale-95 overflow-hidden"
            style={{ background: "var(--green-primary)", color: "var(--text-on-green)" }}
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
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="font-bold text-[18px] text-gray-900">Notifications</h3>
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
                <div className="flex gap-2 p-3 bg-gray-50/50 border-b border-gray-100">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFilter("all"); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === "all" ? 'bg-green-100 text-green-700' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFilter("unread"); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === "unread" ? 'bg-green-100 text-green-700' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
                  >
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                  </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto max-h-[50vh] bg-white">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm font-medium text-gray-500">No notifications here</p>
                    </div>
                  ) : (
                    filteredNotifications.map(n => {
                      const style = NOTIFICATION_STYLES[n.type] || NOTIFICATION_STYLES.summary;
                      const Icon = style.icon;
                      
                      return (
                        <div 
                          key={n.id}
                          onClick={() => !n.read && markAsRead(n.id)}
                          className={`relative flex items-start gap-3 p-4 border-b border-gray-50 transition-colors ${!n.read ? 'bg-[#F0FDF4] cursor-pointer' : 'bg-white'} group`}
                        >
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: style.bg, color: style.color }}
                          >
                            <Icon size={18} />
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-6">
                            <h4 className="text-[14px] font-bold text-gray-900 truncate">
                              {n.title}
                            </h4>
                            <p className="text-[13px] text-gray-600 mt-0.5 leading-snug">
                              {n.message}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1 font-medium">
                              {formatTimeAgo(n.time)}
                            </p>
                          </div>

                          {!n.read && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                            className="absolute right-2 top-2 p-1.5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all sm:opacity-100 sm:bg-transparent"
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
