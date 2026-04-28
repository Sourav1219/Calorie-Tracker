import { useEffect, useState } from "react";
import { BadgeCheck, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import MacroBar from "./MacroBar";
import { useMealSections } from "../context/MealSectionContext";

function getMeasurementOptions(food) {
  if (Array.isArray(food?.measurementOptions) && food.measurementOptions.length > 0) {
    return food.measurementOptions;
  }

  // Fallback: server should always provide options, but just in case
  return [
    { unit: "g", grams: 1, label: "Gram" },
  ];
}

function getUnitFactor(measurementOptions, unit) {
  const match = measurementOptions.find((option) => option.unit === unit);
  return match?.grams || 1;
}

function getUnitLabel(measurementOptions, unit) {
  const match = measurementOptions.find((option) => option.unit === unit);
  return match?.label || unit;
}

function normalizeQuantityForNutrition(quantity, unit, measurementOptions) {
  const factor = getUnitFactor(measurementOptions, unit);
  return Number(quantity) * factor;
}

function convertQuantityBetweenUnits(quantity, fromUnit, toUnit, measurementOptions) {
  const fromFactor = getUnitFactor(measurementOptions, fromUnit);
  const toFactor = getUnitFactor(measurementOptions, toUnit);
  const baseQuantity = Number(quantity) * fromFactor;
  return Number((baseQuantity / toFactor).toFixed(2));
}

export default function FoodDetailModal({ food, onClose, onAddToMeal, targetSectionId }) {
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("katori");
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sections } = useMealSections();

  const measurementOptions = getMeasurementOptions(food);
  const defaultUnit = food?.defaultMeasurementUnit
    || measurementOptions.find((option) => option.unit === food?.servingUnit)?.unit
    || measurementOptions[0]?.unit
    || "g";

  useEffect(() => {
    if (food) {
      let initialQuantity = 1;
      if (food.defaultQuantity) {
        initialQuantity = food.defaultQuantity;
      } else if (defaultUnit === food.servingUnit) {
        initialQuantity = food.servingSize || 1;
      }
      setQuantity(initialQuantity);
      setUnit(defaultUnit);
      setShowMealSelector(false);
      setIsSubmitting(false);

      // Prevent body scroll and signal modal is open
      document.body.classList.add("modal-open");
      return () => document.body.classList.remove("modal-open");
    }
  }, [food, defaultUnit]);

  if (!food) return null;

  const effectiveQuantity = normalizeQuantityForNutrition(quantity, unit, measurementOptions);
  const multiplier = effectiveQuantity / food.servingSize;
  const cal = Math.round(food.caloriesPer * multiplier);
  const p = (food.proteinG * multiplier).toFixed(1);
  const c = (food.carbsG * multiplier).toFixed(1);
  const f = (food.fatG * multiplier).toFixed(1);
  const fibre = (food.fibreG * multiplier).toFixed(1);
  const sugar = (food.sugarG * multiplier).toFixed(1);
  const sodium = Math.round(food.sodiumMg * multiplier);

  const handleAddToMeal = async (sectionId) => {
    try {
      setIsSubmitting(true);
      if (onAddToMeal) {
        await onAddToMeal(food, Number(quantity), unit, sectionId);
      }
      onClose();
    } catch (error) {
      toast.error(error?.message || "Failed to add meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="absolute inset-0"
        onClick={showMealSelector ? () => setShowMealSelector(false) : onClose}
      />

      {!showMealSelector ? (
        <div
          className="relative w-full max-w-md overflow-hidden rounded-[24px] animate-slide-up flex flex-col max-h-full"
          style={{
            background: "var(--surface-modal)",
            borderTop: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <div className="flex-shrink-0 flex items-start justify-between px-4 py-3 sm:px-5" style={{ borderBottom: "1px solid var(--border-default)" }}>
            <div className="pr-4">
              <div className="mb-1.5 flex items-center gap-2">
                <h2 className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {food.name}
                </h2>
                {food.isVerified && <BadgeCheck className="h-5 w-5" style={{ color: "var(--green-primary)" }} />}
              </div>
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}
              >
                {food.category}
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4 hide-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="rounded-2xl p-3.5" style={{ border: "1px solid var(--border-default)", background: "var(--surface-3)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                  Calories
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-black leading-none" style={{ color: "var(--text-primary)" }}>
                    {cal}
                  </span>
                  <span className="pb-1 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>kcal</span>
                </div>

                <div className="mt-3">
                  <MacroBar proteinG={p} carbsG={c} fatG={f} size="md" />
                </div>
              </div>

              <div className="rounded-2xl p-3.5" style={{ border: "1px solid var(--border-default)", background: "var(--surface-3)" }}>
                <label className="mb-2 block text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                  Serving size
                </label>
                <div className="grid gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="input-field"
                  />
                  <select
                    value={unit}
                    onChange={(e) => {
                      const nextUnit = e.target.value;
                      setQuantity((currentQuantity) =>
                        convertQuantityBetweenUnits(currentQuantity, unit, nextUnit, measurementOptions)
                      );
                      setUnit(nextUnit);
                    }}
                    className="input-field"
                  >
                    {measurementOptions.map((option) => (
                      <option key={option.unit} value={option.unit}>
                        {option.label || option.unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
              <div className="px-3 py-2 text-sm font-semibold" style={{ borderBottom: "1px solid var(--divider)", color: "var(--text-secondary)", background: "var(--surface-3)" }}>
                Nutrition Facts
              </div>
              {[
                ["Calories", `${cal} kcal`, true],
                ["Protein", `${p} g`],
                ["Carbs", `${c} g`],
                ["Fat", `${f} g`],
                ["Fibre", `${fibre} g`],
                ["Sugar", `${sugar} g`],
                ["Sodium", `${sodium} mg`],
              ].map(([label, value, isCalories], idx) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderTop: idx === 0 ? "none" : "1px solid var(--divider)" }}
                >
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span
                    style={{
                      color: "var(--text-primary)",
                      fontSize: isCalories ? "20px" : "14px",
                      fontWeight: isCalories ? 700 : 600,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 p-4 sm:p-5 pt-3" style={{ borderTop: "1px solid var(--border-default)" }}>
            <button
              onClick={() => {
                if (targetSectionId) {
                  handleAddToMeal(targetSectionId);
                } else {
                  setShowMealSelector(true);
                }
              }}
              disabled={isSubmitting}
              className="w-full h-[52px] flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-all duration-150 active:scale-[0.98] btn-spring disabled:opacity-50"
              style={{
                background: "var(--green-primary)",
                color: "var(--text-on-green)",
                border: "none",
              }}
            >
              {isSubmitting && targetSectionId ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add to Meal
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="relative w-full max-w-md overflow-hidden rounded-[24px] animate-fade-up max-h-full flex flex-col"
          style={{ background: "var(--surface-modal)", boxShadow: "var(--shadow-modal)" }}
        >
          <div className="flex items-start justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
            <div className="pr-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Select meal section
              </p>
              <h3 className="mt-1 text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Add {food.name}
              </h3>
            </div>
            <button
              onClick={() => setShowMealSelector(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-2xl px-3.5 py-3" style={{ border: "1px solid var(--border-default)", background: "var(--surface-3)" }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Serving</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {quantity} {getUnitLabel(measurementOptions, unit)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Calories</span>
                <span style={{ color: "var(--green-text)", fontWeight: 700 }}>{cal} kcal</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {sections.map((section) => (
                <button
                  key={section._id}
                  disabled={isSubmitting}
                  onClick={() => handleAddToMeal(section._id)}
                  className="rounded-xl border py-3.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--surface-3)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isSubmitting ? "Saving..." : `${section.icon || "🍽️"} ${section.name}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
