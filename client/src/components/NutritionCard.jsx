import { memo } from "react";
import { BadgeCheck, Plus } from "lucide-react";
import MacroBar from "./MacroBar";

function highlightMatch(text, query) {
  if (!query || !query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + lowerQuery.length)}</mark>
      {text.slice(idx + lowerQuery.length)}
    </>
  );
}

const FoodCard = memo(function FoodCard({ food, onSelect, searchQuery = "", index = 0 }) {
  return (
    <div
      onClick={() => onSelect(food)}
      className="food-card-cascade food-card-hover card p-4 flex justify-between items-center cursor-pointer active:scale-[0.99] border-l-[4px]"
      style={{
        borderColor: "var(--border-default)",
        borderLeftColor: "var(--green-primary)",
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-sm md:text-base truncate" style={{ color: "var(--text-primary)" }}>
            {highlightMatch(food.name, searchQuery)}
          </h3>
          {food.isVerified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--green-primary)" }} />}
        </div>
        <p className="text-sm mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
          {food.category}
        </p>
        <MacroBar proteinG={food.proteinG} carbsG={food.carbsG} fatG={food.fatG} size="sm" />
      </div>

      <div className="flex flex-col items-end gap-3 pl-4">
        <div
          className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-bold"
          style={{
            background: "var(--green-subtle)",
            color: "var(--green-text)",
            border: "1px solid var(--green-border)",
          }}
        >
          {Math.round((food.caloriesPer / (food.servingSize || 100)) * 100)} kcal per 100{food.servingUnit || "g"}
        </div>
        <button
          className="add-btn-pop w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90 btn-spring"
          style={{
            background: "var(--green-primary)",
            border: "none",
            color: "var(--text-on-green)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(food);
          }}
          aria-label={`Add ${food.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default FoodCard;
