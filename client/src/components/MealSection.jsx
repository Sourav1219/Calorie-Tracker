import { Plus } from "lucide-react";

const mealEmojis = { breakfast: "🌅", lunch: "☀️", snacks: "🍿", dinner: "🌙" };

export default function MealSection({ mealType = "breakfast", items = [], onAdd }) {
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);

  return (
    <div className="card mb-3 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{mealEmojis[mealType] || "🍽️"}</span>
          <div>
            <h3 className="font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
              {mealType}
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {totalCalories} kcal
            </p>
          </div>
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-sm font-semibold rounded-[10px] px-4 py-2 transition-all duration-150 active:scale-[0.97]"
          style={{
            background: "var(--green-primary)",
            color: "var(--text-on-green)",
          }}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {items.length > 0 ? (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)" }}>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2.5 px-3 animate-fade-up"
              style={{
                borderTop: i > 0 ? "1px solid var(--divider)" : "none",
                animationDelay: `${i * 45}ms`,
              }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {item.quantity} {item.unit}
                </p>
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                {item.calories} kcal
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
          No items logged
        </p>
      )}
    </div>
  );
}
