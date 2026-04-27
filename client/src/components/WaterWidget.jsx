import { Droplets, Plus } from "lucide-react";

export default function WaterWidget({ current = 0, goal = 2500, onAdd }) {
  const progress = Math.min((current / goal) * 100, 100);
  const glasses = Math.floor(current / 250);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-water" />
          <h3 className="font-semibold text-text">Water</h3>
        </div>
        <button onClick={onAdd} className="w-8 h-8 rounded-full bg-water/10 flex items-center justify-center text-water hover:bg-water/20 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
        <div className="h-full bg-water rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{current} ml</span>
        <span>{glasses} glasses • {goal} ml goal</span>
      </div>
    </div>
  );
}
