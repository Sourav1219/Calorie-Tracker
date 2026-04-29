export default function MacroBar({ proteinG = 0, carbsG = 0, fatG = 0, size = "sm" }) {
  const pCal = proteinG * 4;
  const cCal = carbsG * 4;
  const fCal = fatG * 9;
  const totalCal = pCal + cCal + fCal;

  const pPct = totalCal === 0 ? 0 : (pCal / totalCal) * 100;
  const cPct = totalCal === 0 ? 0 : (cCal / totalCal) * 100;
  const fPct = totalCal === 0 ? 0 : (fCal / totalCal) * 100;



  if (size === "sm") {
    return (
      <div className="flex w-full h-1 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--bg-subtle)" }}>
        <div className="transition-all duration-500" style={{ width: `${cPct}%`, background: "#22c55e" }} title={`Carbs: ${carbsG}g`} />
        <div className="transition-all duration-500" style={{ width: `${pPct}%`, background: "#3b82f6" }} title={`Protein: ${proteinG}g`} />
        <div className="transition-all duration-500" style={{ width: `${fPct}%`, background: "#f97316" }} title={`Fat: ${fatG}g`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2 w-full">
      <div className="flex w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
        <div className="transition-all duration-500" style={{ width: `${cPct}%`, background: "#22c55e" }} title={`Carbs: ${carbsG}g`} />
        <div className="transition-all duration-500" style={{ width: `${pPct}%`, background: "#3b82f6" }} title={`Protein: ${proteinG}g`} />
        <div className="transition-all duration-500" style={{ width: `${fPct}%`, background: "#f97316" }} title={`Fat: ${fatG}g`} />
      </div>
      <div className="flex gap-3 text-[11px] md:text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }} />
          C: {Number(carbsG).toFixed(1).replace(/\.0$/, "")}g
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#3b82f6" }} />
          P: {Number(proteinG).toFixed(1).replace(/\.0$/, "")}g
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f97316" }} />
          F: {Number(fatG).toFixed(1).replace(/\.0$/, "")}g
        </span>
      </div>
    </div>
  );
}
