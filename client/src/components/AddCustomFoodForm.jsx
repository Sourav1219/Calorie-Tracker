import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { foodAPI } from "../utils/api";

const DEFAULT_CATEGORIES = [
  "Vegetables & Curries",
  "Rice & Grains",
  "Dal & Legumes",
  "Indian Breads",
  "Beverages",
];

const UNITS = ["g", "ml", "katori", "piece", "cup", "glass", "bowl", "plate", "slice", "tbsp", "tsp"];

export default function AddCustomFoodForm({ onClose, onSuccess }) {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: DEFAULT_CATEGORIES[0],
    servingSize: 100,
    servingUnit: "g",
    caloriesPer: "",
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fibreG: 0,
    sugarG: 0,
    sodiumMg: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await foodAPI.getCategories();
        const next = response.data.categories?.length ? response.data.categories : DEFAULT_CATEGORIES;
        setCategories(next);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    loadCategories();
  }, []);

  // Prevent body scroll and signal modal is open
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const p = Number(formData.proteinG) || 0;
  const c = Number(formData.carbsG) || 0;
  const f = Number(formData.fatG) || 0;
  const macroCal = p * 4 + c * 4 + f * 9;
  const enteredCal = Number(formData.caloriesPer) || 0;

  let showWarning = false;
  if (enteredCal > 0 && macroCal > 0) {
    const diff = Math.abs(enteredCal - macroCal);
    if (diff / enteredCal > 0.2) showWarning = true;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || formData.name.trim().length < 2) return toast.error("Food name must be at least 2 characters.");
    if (!formData.caloriesPer || formData.caloriesPer <= 0) return toast.error("Calories per serving must be greater than 0.");
    if (!formData.servingSize || formData.servingSize <= 0) return toast.error("Serving size must be greater than 0.");

    const macroFields = ["proteinG", "carbsG", "fatG", "fibreG", "sugarG", "sodiumMg"];
    for (const field of macroFields) {
      if (formData[field] < 0) return toast.error("Nutritional values cannot be negative.");
    }

    setIsLoading(true);
    try {
      await foodAPI.create(formData);
      toast.success(`'${formData.name}' added to the database!`);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add food item");
    } finally {
      setIsLoading(false);
    }
  };

  const sectionHeadingStyle = {
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderLeft: "3px solid var(--green-primary)",
    paddingLeft: "8px",
    fontWeight: 700,
    fontSize: "12px",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "var(--bg-modal-overlay)" }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col animate-slide-up" style={{ background: "var(--surface-modal)", boxShadow: "var(--shadow-modal)" }}>
        <div className="flex items-center justify-between p-4 sticky top-0 z-10 rounded-t-2xl" style={{ borderBottom: "1px solid var(--border-default)", background: "var(--surface-modal)" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Custom Food</h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 pb-24">
          <form id="add-food-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <p style={sectionHeadingStyle}>Basics</p>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Food name" className="input-field" />
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="Brand (optional)" className="input-field" />
              <select name="category" value={formData.category} onChange={handleChange} className="input-field">
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <p style={sectionHeadingStyle}>Serving</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" name="servingSize" value={formData.servingSize} onChange={handleChange} min="0.1" step="0.1" required className="input-field" />
                <select name="servingUnit" value={formData.servingUnit} onChange={handleChange} className="input-field">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <input type="number" name="caloriesPer" value={formData.caloriesPer} onChange={handleChange} min="1" required placeholder="Calories per serving" className="input-field" />
            </div>

            <div className="space-y-3">
              <p style={sectionHeadingStyle}>Nutrition</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" name="proteinG" value={formData.proteinG} onChange={handleChange} min="0" step="0.1" className="input-field" placeholder="Protein (g)" />
                <input type="number" name="carbsG" value={formData.carbsG} onChange={handleChange} min="0" step="0.1" className="input-field" placeholder="Carbs (g)" />
                <input type="number" name="fatG" value={formData.fatG} onChange={handleChange} min="0" step="0.1" className="input-field" placeholder="Fat (g)" />
                <input type="number" name="fibreG" value={formData.fibreG} onChange={handleChange} min="0" step="0.1" className="input-field" placeholder="Fibre (g)" />
                <input type="number" name="sugarG" value={formData.sugarG} onChange={handleChange} min="0" step="0.1" className="input-field" placeholder="Sugar (g)" />
                <input type="number" name="sodiumMg" value={formData.sodiumMg} onChange={handleChange} min="0" step="1" className="input-field" placeholder="Sodium (mg)" />
              </div>
            </div>
          </form>

          {macroCal > 0 && (
            <div
              className="mt-5 p-3 rounded-xl border"
              style={{
                background: "var(--orange-subtle)",
                borderColor: "rgba(249,115,22,0.3)",
                color: "var(--text-primary)",
              }}
            >
              <div className="flex justify-between items-center text-sm font-medium">
                <span>From macros:</span>
                <span>{Math.round(macroCal)} kcal</span>
              </div>
              {showWarning && (
                <div className="flex items-start gap-1.5 mt-2 text-xs p-2 rounded-md" style={{ background: "rgba(249,115,22,0.12)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Calorie count may be off. Double check your macro values.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 absolute bottom-0 left-0 right-0 rounded-b-2xl" style={{ borderTop: "1px solid var(--border-default)", background: "var(--surface-modal)" }}>
          <button
            type="submit"
            form="add-food-form"
            disabled={isLoading}
            className="w-full py-3 text-base font-semibold rounded-[14px] transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "var(--green-primary)",
              color: "var(--text-on-green)",
              border: "none",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </span>
            ) : (
              "Add Food to Database"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
