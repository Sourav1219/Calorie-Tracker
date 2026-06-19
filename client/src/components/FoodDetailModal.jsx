import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [unit, setUnit] = useState("");
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

  // Macro energy split for the colored stat cards
  const macroCals = { protein: Number(p) * 4, carbs: Number(c) * 4, fat: Number(f) * 9 };
  const totalMacroCal = macroCals.protein + macroCals.carbs + macroCals.fat;
  const macros = [
    { key: "protein", label: "Protein", grams: p, color: "#7c93f0" },
    { key: "carbs", label: "Carbs", grams: c, color: "#52bd8a" },
    { key: "fat", label: "Fat", grams: f, color: "#f0857e" },
  ].map((m) => ({ ...m, pct: totalMacroCal > 0 ? (macroCals[m.key] / totalMacroCal) * 100 : 0 }));

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

  return createPortal(
    <div className="modal-overlay">
      <div
        className="absolute inset-0"
        onClick={showMealSelector ? () => setShowMealSelector(false) : onClose}
      />

      {!showMealSelector ? (
        <div className="modal-card animate-slide-up">
          <div className="flex-shrink-0 flex items-start justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--lg-border)" }}>
            <div className="pr-4">
              <div className="mb-1.5 flex items-center gap-2">
                <h2 className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {food.name}
                </h2>
                {food.isVerified && <BadgeCheck className="h-5 w-5 flex-shrink-0" style={{ color: "var(--green-primary)" }} />}
              </div>
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                style={{ background: "var(--green-subtle)", color: "var(--green-text)", border: "1px solid var(--green-border)" }}
              >
                {food.category}
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4 hide-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Serving size control */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Serving size
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field flex-1"
                />
                <select
                  value={unit}
                  onChange={(e) => {
                    const nextUnit = e.target.value;
                    if (food?.brand?.toLowerCase() !== "amul") {
                      setQuantity((currentQuantity) =>
                        convertQuantityBetweenUnits(currentQuantity, unit, nextUnit, measurementOptions)
                      );
                    }
                    setUnit(nextUnit);
                  }}
                  className="input-field flex-1"
                >
                  {measurementOptions.map((option) => (
                    <option key={option.unit} value={option.unit}>
                      {option.label || option.unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calorie hero */}
            <div
              className="rounded-2xl p-5 text-center relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, var(--green-subtle), transparent 90%), var(--lg-tint)",
                border: "1px solid var(--green-border)",
                boxShadow: "inset 0 1px 0 var(--lg-hl-top)",
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                Calories
              </p>
              <div className="mt-1 flex items-end justify-center gap-1.5">
                <span className="text-5xl font-black leading-none" style={{ color: "var(--text-primary)", letterSpacing: "-1px" }}>
                  {cal}
                </span>
                <span className="pb-1.5 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>kcal</span>
              </div>
              <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                per {quantity} {getUnitLabel(measurementOptions, unit)}
              </p>
              <div className="mt-3.5">
                <MacroBar proteinG={p} carbsG={c} fatG={f} size="sm" />
              </div>
            </div>

            {/* Macro stat cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {macros.map((m) => (
                <div
                  key={m.key}
                  className="rounded-2xl p-3"
                  style={{ background: `${m.color}14`, border: `1px solid ${m.color}33` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                    <span className="text-[11px] font-bold truncate" style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                  </div>
                  <p className="mt-1.5 text-xl font-black leading-none" style={{ color: m.color }}>
                    {m.grams}<span className="text-xs font-bold">g</span>
                  </p>
                  <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${m.pct}%`, background: m.color }} />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                    {Math.round(m.pct)}% energy
                  </p>
                </div>
              ))}
            </div>

            {/* Extra nutrition chips */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["Fibre", `${fibre}`, "g"],
                ["Sugar", `${sugar}`, "g"],
                ["Sodium", `${sodium}`, "mg"],
              ].map(([label, value, unitLabel]) => (
                <div
                  key={label}
                  className="rounded-2xl p-3 text-center"
                  style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="mt-1 text-base font-extrabold leading-none" style={{ color: "var(--text-primary)" }}>
                    {value}<span className="text-[10px] font-semibold ml-0.5" style={{ color: "var(--text-muted)" }}>{unitLabel}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 p-4 sm:p-5 pt-3" style={{ borderTop: "1px solid var(--lg-border)" }}>
            <button
              onClick={() => {
                if (targetSectionId) {
                  handleAddToMeal(targetSectionId);
                } else {
                  setShowMealSelector(true);
                }
              }}
              disabled={isSubmitting}
              className="glass-green w-full h-[52px] flex items-center justify-center gap-2 rounded-[14px] font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] no-spring disabled:opacity-50"
            >
              {isSubmitting && targetSectionId ? (
                <>
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
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
        <div className="modal-card animate-fade-up">
          <div className="flex items-start justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--lg-border)" }}>
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
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-2xl px-3.5 py-3" style={{ border: "1px solid var(--lg-border)", background: "var(--lg-tint)" }}>
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
                    background: "var(--lg-tint)",
                    border: "1px solid var(--lg-border)",
                    boxShadow: "inset 0 1px 0 var(--lg-hl-top)",
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
    </div>,
    document.body
  );
}
