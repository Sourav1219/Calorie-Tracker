/**
 * Animated Meal Icons — modern gradient SVGs with lively micro-animations.
 * The meal → icon mapping is fixed so each meal type looks identical everywhere
 * (Meal Log, Dashboard meal breakdown, section sheet, etc.).
 * Falls back to the stored emoji for custom sections.
 */

const BreakfastIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-breakfast" width="28" height="28">
    <defs>
      <linearGradient id="bfCup" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="bfBrew" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A16207" />
        <stop offset="100%" stopColor="#713F12" />
      </linearGradient>
    </defs>
    {/* base shadow */}
    <ellipse cx="19" cy="35" rx="12" ry="2.2" fill="#92400E" opacity="0.16" className="meal-shadow" />
    {/* steam */}
    <path d="M13 13 C13 9 15.5 9.5 15.5 5.5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" className="steam-line-1" />
    <path d="M19 12 C19 8 21.5 8.5 21.5 4.5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" className="steam-line-2" />
    <path d="M25 13 C25 9 27.5 9.5 27.5 5.5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" className="steam-line-3" />
    {/* handle */}
    <path d="M30 19 C35.5 19 35.5 28 30 28" stroke="url(#bfCup)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
    {/* cup body */}
    <path d="M8 16 H30 V23 A11 11 0 0 1 8 23 Z" fill="url(#bfCup)" />
    {/* brew surface */}
    <ellipse cx="19" cy="16.5" rx="10.5" ry="2.6" fill="url(#bfBrew)" />
    {/* gloss highlight */}
    <path d="M12 20 Q13 27 19 29.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" fill="none" />
  </svg>
);

const LunchIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-lunch" width="28" height="28">
    <defs>
      <linearGradient id="luBowl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <ellipse cx="20" cy="35" rx="13" ry="2.2" fill="#065F46" opacity="0.16" className="meal-shadow" />
    {/* steam */}
    <path d="M14 12 C14 8 16.5 8.5 16.5 4.5" stroke="#6EE7B7" strokeWidth="2" strokeLinecap="round" className="steam-line-1" />
    <path d="M20 11 C20 7 22.5 7.5 22.5 3.5" stroke="#6EE7B7" strokeWidth="2" strokeLinecap="round" className="steam-line-2" />
    <path d="M26 12 C26 8 28.5 8.5 28.5 4.5" stroke="#6EE7B7" strokeWidth="2" strokeLinecap="round" className="steam-line-3" />
    {/* food mound */}
    <ellipse cx="20" cy="18.5" rx="14" ry="4.6" fill="#A7F3D0" />
    <circle cx="14" cy="16.5" r="2" fill="#F97316" className="bowl-bit bowl-bit-1" />
    <circle cx="22" cy="15.5" r="1.8" fill="#EF4444" className="bowl-bit bowl-bit-2" />
    <circle cx="26" cy="17.5" r="1.6" fill="#FBBF24" className="bowl-bit bowl-bit-3" />
    {/* bowl */}
    <path d="M5 19 H35 A15 15 0 0 1 5 19 Z" fill="url(#luBowl)" />
    {/* rim highlight */}
    <path d="M7 20 Q20 28 33 20" stroke="#D1FAE5" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" fill="none" />
  </svg>
);

const SnacksIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-snacks" width="28" height="28">
    <defs>
      <linearGradient id="snDough" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="snGlaze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#DB2777" />
      </linearGradient>
    </defs>
    <ellipse cx="20" cy="35" rx="12" ry="2.2" fill="#9D174D" opacity="0.14" className="meal-shadow" />
    {/* dough ring */}
    <circle cx="20" cy="20" r="13" fill="url(#snDough)" />
    {/* glaze */}
    <circle cx="20" cy="18.5" r="12" fill="url(#snGlaze)" />
    {/* hole */}
    <circle cx="20" cy="19.5" r="4.6" fill="#FFF7ED" />
    {/* gloss */}
    <path d="M11 16 Q14 10 21 9" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" fill="none" />
    {/* sprinkles */}
    <rect x="12.5" y="12" width="3.4" height="1.5" rx="0.75" fill="#22C55E" transform="rotate(35 14 12.5)" className="sprinkle sprinkle-1" />
    <rect x="24" y="11.5" width="3.4" height="1.5" rx="0.75" fill="#3B82F6" transform="rotate(-25 25 12)" className="sprinkle sprinkle-2" />
    <rect x="28" y="20" width="3.4" height="1.5" rx="0.75" fill="#FFFFFF" transform="rotate(60 29 20.5)" className="sprinkle sprinkle-3" />
    <rect x="9" y="21" width="3.4" height="1.5" rx="0.75" fill="#8B5CF6" transform="rotate(-50 10 21.5)" className="sprinkle sprinkle-4" />
    <rect x="19" y="28" width="3.4" height="1.5" rx="0.75" fill="#FACC15" transform="rotate(20 20 28.5)" className="sprinkle sprinkle-5" />
  </svg>
);

const DinnerIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="meal-icon meal-icon-dinner" width="28" height="28">
    <defs>
      <linearGradient id="dnDome" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#CBD5E1" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
      <linearGradient id="dnPlate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
    <ellipse cx="20" cy="33.5" rx="15" ry="2.4" fill="#1E293B" opacity="0.14" className="meal-shadow" />
    {/* moon + stars accent */}
    <path d="M31 5 A4 4 0 1 0 35 9 A3 3 0 0 1 31 5 Z" fill="#A78BFA" className="moon-accent" />
    <circle cx="28" cy="4" r="0.9" fill="#C4B5FD" className="star-1" />
    <circle cx="36" cy="13" r="0.7" fill="#C4B5FD" className="star-2" />
    {/* plate */}
    <ellipse cx="20" cy="29" rx="15" ry="3.2" fill="url(#dnPlate)" />
    {/* cloche dome */}
    <path d="M8 29 A12 12 0 0 1 32 29 Z" fill="url(#dnDome)" />
    {/* dome highlight */}
    <path d="M13 27 A8 8 0 0 1 19 18.5" stroke="#F8FAFC" strokeWidth="1.7" strokeLinecap="round" opacity="0.6" fill="none" className="dome-shine" />
    {/* knob */}
    <line x1="20" y1="17" x2="20" y2="14.5" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="20" cy="14" r="1.9" fill="#64748B" />
  </svg>
);

const ICON_MAP = {
  breakfast: BreakfastIcon,
  lunch: LunchIcon,
  snacks: SnacksIcon,
  snack: SnacksIcon,
  dinner: DinnerIcon,
};

export default function MealIcon({ name, fallbackEmoji }) {
  const key = (name || "").toLowerCase().trim();
  const IconComponent = ICON_MAP[key];

  if (IconComponent) {
    return <IconComponent />;
  }

  // Fallback to emoji for custom sections
  return <span className="text-xl">{fallbackEmoji || "🍽️"}</span>;
}
