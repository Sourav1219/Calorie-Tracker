/**
 * PureIntake brand mark — a liquid-glass squircle with a frosted
 * translucent surface, green leaf icon, and specular edge highlights.
 * Matches the app's --lg-* design language.
 */
export default function BrandMark({ size = 56, className = "", style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Frosted glass background — translucent green tint */}
        <linearGradient id="bm-glass" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
          <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.14" />
        </linearGradient>
        {/* Top gloss sheen — liquid glass signature */}
        <linearGradient id="bm-sheen" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Leaf gradient — green to teal */}
        <linearGradient id="bm-leaf" x1="14" y1="11" x2="32" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        {/* Leaf inner gloss */}
        <linearGradient id="bm-leaf-gloss" x1="20" y1="12" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Glass squircle base */}
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#bm-glass)" />
      {/* Sheen overlay */}
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#bm-sheen)" />

      {/* Leaf shape — filled with green gradient */}
      <path
        d="M24 11.5 C 32.5 15.5, 35.5 25, 30 35.5 C 21.5 33.5, 13.5 28, 15.5 18.5 C 17 13.8, 20.3 11.9, 24 11.5 Z"
        fill="url(#bm-leaf)"
      />
      {/* Leaf gloss highlight */}
      <path
        d="M24 11.5 C 32.5 15.5, 35.5 25, 30 35.5 C 21.5 33.5, 13.5 28, 15.5 18.5 C 17 13.8, 20.3 11.9, 24 11.5 Z"
        fill="url(#bm-leaf-gloss)"
      />
      {/* Leaf vein */}
      <path
        d="M20.5 31.5 C 23 24, 26 19, 30.5 15.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Specular top edge highlight — crisp white rim */}
      <rect x="1.75" y="1.75" width="44.5" height="44.5" rx="12.25" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" />
      {/* Glass border */}
      <rect x="1" y="1" width="46" height="46" rx="13" fill="none" stroke="#22c55e" strokeOpacity="0.25" strokeWidth="1" />
      {/* Bottom rim glow */}
      <rect x="1.75" y="1.75" width="44.5" height="44.5" rx="12.25" fill="none" stroke="#000000" strokeOpacity="0.06" strokeWidth="0.5" />
    </svg>
  );
}
