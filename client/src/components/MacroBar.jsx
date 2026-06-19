const MACROS = [
  { key: "carbs", label: "C", name: "Carbs", color: "#52bd8a", glow: "rgba(82,189,138,0.4)" },
  { key: "protein", label: "P", name: "Protein", color: "#7c93f0", glow: "rgba(124,147,240,0.4)" },
  { key: "fat", label: "F", name: "Fat", color: "#f0857e", glow: "rgba(240,133,126,0.4)" },
];

// Vertical gloss overlay on top of the solid macro color → glassy 3D pill.
function glossy(color) {
  return `linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0) 55%), ${color}`;
}

const fmt = (n) => Number(n).toFixed(1).replace(/\.0$/, "");

export default function MacroBar({ proteinG = 0, carbsG = 0, fatG = 0, size = "sm" }) {
  const grams = {
    carbs: Number(carbsG) || 0,
    protein: Number(proteinG) || 0,
    fat: Number(fatG) || 0,
  };
  const cals = { carbs: grams.carbs * 4, protein: grams.protein * 4, fat: grams.fat * 9 };
  const totalCal = cals.carbs + cals.protein + cals.fat;

  const segments = MACROS.map((m) => ({
    ...m,
    g: grams[m.key],
    pct: totalCal === 0 ? 0 : (cals[m.key] / totalCal) * 100,
  })).filter((s) => s.pct > 0);

  const barH = size === "sm" ? "h-2" : "h-2.5";

  const bar = (
    <div
      className={`relative w-full ${barH} rounded-full`}
      style={{ background: "var(--bg-subtle)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)" }}
    >
      <div className="absolute inset-0 flex items-stretch gap-[2px]">
        {segments.map((s) => (
          <div
            key={s.key}
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${s.pct}%`,
              minWidth: "6px",
              background: glossy(s.color),
              boxShadow: `0 0 6px ${s.glow}`,
            }}
            title={`${s.name}: ${fmt(s.g)}g`}
          />
        ))}
      </div>
    </div>
  );

  if (size === "sm") {
    return <div className="mt-1.5">{bar}</div>;
  }

  return (
    <div className="flex flex-col gap-2.5 mt-2 w-full">
      {bar}
      <div className="flex flex-wrap gap-2">
        {MACROS.map((m) => (
          <span
            key={m.key}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-xs font-bold"
            style={{ background: `${m.color}1a`, color: m.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: m.color }} />
            {m.label} {fmt(grams[m.key])}g
          </span>
        ))}
      </div>
    </div>
  );
}
