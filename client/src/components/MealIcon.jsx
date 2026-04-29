/**
 * Animated Meal Icons — renders a custom animated SVG based on the meal section name.
 * Falls back to the stored emoji if no matching animation exists.
 */
import { memo } from "react";

const BreakfastIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-breakfast" width="28" height="28">
    {/* Coffee cup */}
    <rect x="8" y="16" width="18" height="16" rx="3" fill="#F59E0B" opacity="0.85"/>
    <rect x="10" y="18" width="14" height="5" rx="2" fill="#FBBF24"/>
    {/* Handle */}
    <path d="M26 20 C30 20 32 24 28 28" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    {/* Steam lines */}
    <path d="M14 14 C14 10 16 10 16 6" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" className="steam-line-1"/>
    <path d="M18 13 C18 9 20 9 20 5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" className="steam-line-2"/>
    <path d="M22 14 C22 10 24 10 24 6" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" className="steam-line-3"/>
    {/* Saucer */}
    <ellipse cx="17" cy="33" rx="14" ry="2" fill="#D97706" opacity="0.3"/>
  </svg>
);

const LunchIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-lunch" width="28" height="28">
    {/* Bowl */}
    <path d="M4 18 Q4 30 20 32 Q36 30 36 18 Z" fill="#22C55E" opacity="0.85"/>
    <path d="M4 18 Q4 28 20 30 Q36 28 36 18 Z" fill="#4ADE80"/>
    {/* Rice / food content */}
    <ellipse cx="20" cy="18" rx="16" ry="4" fill="#86EFAC"/>
    <circle cx="14" cy="16" r="2" fill="#F97316" opacity="0.8"/>
    <circle cx="22" cy="15" r="1.8" fill="#EF4444" opacity="0.7"/>
    <circle cx="18" cy="17" r="1.5" fill="#FBBF24" opacity="0.7"/>
    {/* Chopsticks */}
    <line x1="28" y1="6" x2="16" y2="17" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" className="chopstick-1"/>
    <line x1="32" y1="6" x2="20" y2="17" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" className="chopstick-2"/>
  </svg>
);

const SnacksIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-snacks" width="28" height="28">
    {/* Cookie base */}
    <circle cx="20" cy="20" r="14" fill="#D97706" opacity="0.85"/>
    <circle cx="20" cy="20" r="12" fill="#F59E0B"/>
    {/* Chocolate chips */}
    <circle cx="15" cy="16" r="2" fill="#78350F" className="chip chip-1"/>
    <circle cx="22" cy="14" r="1.8" fill="#78350F" className="chip chip-2"/>
    <circle cx="24" cy="22" r="2.2" fill="#78350F" className="chip chip-3"/>
    <circle cx="16" cy="24" r="1.5" fill="#78350F" className="chip chip-4"/>
    <circle cx="20" cy="20" r="1.8" fill="#78350F" className="chip chip-5"/>
    {/* Crumbs */}
    <circle cx="34" cy="32" r="1.5" fill="#FBBF24" opacity="0.5" className="crumb crumb-1"/>
    <circle cx="30" cy="34" r="1" fill="#F59E0B" opacity="0.4" className="crumb crumb-2"/>
  </svg>
);

const DinnerIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-dinner" width="28" height="28">
    {/* Plate */}
    <ellipse cx="20" cy="24" rx="16" ry="10" fill="#E5E7EB" opacity="0.6"/>
    <ellipse cx="20" cy="24" rx="13" ry="8" fill="#F3F4F6"/>
    <ellipse cx="20" cy="24" rx="10" ry="6" fill="white"/>
    {/* Steak / food */}
    <ellipse cx="20" cy="23" rx="7" ry="4" fill="#DC2626" opacity="0.75"/>
    <ellipse cx="20" cy="22" rx="5" ry="3" fill="#EF4444"/>
    {/* Grill marks */}
    <line x1="17" y1="21" x2="17" y2="24" stroke="#991B1B" strokeWidth="0.8" opacity="0.4"/>
    <line x1="20" y1="20" x2="20" y2="24" stroke="#991B1B" strokeWidth="0.8" opacity="0.4"/>
    <line x1="23" y1="21" x2="23" y2="24" stroke="#991B1B" strokeWidth="0.8" opacity="0.4"/>
    {/* Fork */}
    <g className="utensil-fork">
      <line x1="4" y1="12" x2="4" y2="30" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2" y1="12" x2="2" y2="18" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round"/>
      <line x1="4" y1="12" x2="4" y2="18" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round"/>
      <line x1="6" y1="12" x2="6" y2="18" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round"/>
    </g>
    {/* Knife */}
    <g className="utensil-knife">
      <line x1="36" y1="12" x2="36" y2="30" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M36 12 Q38 14 38 20 L36 20" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5"/>
    </g>
    {/* Moon accent */}
    <path d="M30 4 Q34 4 34 8 Q30 6 30 4 Z" fill="#8B5CF6" opacity="0.6" className="moon-accent"/>
    <circle cx="32" cy="3" r="0.8" fill="#8B5CF6" opacity="0.4" className="star-1"/>
    <circle cx="35" cy="6" r="0.6" fill="#8B5CF6" opacity="0.3" className="star-2"/>
  </svg>
);

const ICON_MAP = {
  breakfast: BreakfastIcon,
  lunch: LunchIcon,
  snacks: SnacksIcon,
  snack: SnacksIcon,
  dinner: DinnerIcon,
};

const MealIcon = memo(function MealIcon({ name, fallbackEmoji }) {
  const key = (name || "").toLowerCase().trim();
  const IconComponent = ICON_MAP[key];

  if (IconComponent) {
    return <IconComponent />;
  }

  // Fallback to emoji for custom sections
  return <span className="text-xl">{fallbackEmoji || "🍽️"}</span>;
});

export default MealIcon;
