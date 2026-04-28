import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "../context/UserContext";
import { adminAPI, foodAPI } from "../utils/api";

const HEADER_KEY_MAP = {
  name: "name", brand: "brand", category: "category",
  servingsize: "servingSize", servingunit: "servingUnit",
  caloriesper: "caloriesPer", proteing: "proteinG", carbsg: "carbsG",
  fatg: "fatG", fibreg: "fibreG", sugarg: "sugarG",
  sodiummg: "sodiumMg", isverified: "isVerified",
};

function splitCsvLine(line) {
  const values = []; let current = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { current += '"'; i++; } else inQ = !inQ; continue; }
    if (c === "," && !inQ) { values.push(current.trim()); current = ""; continue; }
    current += c;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs a header + at least 1 data row");
  const headers = splitCsvLine(lines[0]).map(h => HEADER_KEY_MAP[h.toLowerCase().replace(/[\s_-]/g, "")] || null);
  if (headers.some(h => !h)) throw new Error("Unknown CSV header detected");
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line); const row = {};
    headers.forEach((key, i) => { row[key] = cells[i] ?? ""; });
    // coerce numbers
    ["servingSize","caloriesPer","proteinG","carbsG","fatG","fibreG","sugarG","sodiumMg"].forEach(f => {
      if (row[f] !== undefined && row[f] !== "") row[f] = Number(row[f]);
    });
    if (typeof row.isVerified === "string") row.isVerified = !["false","0","no"].includes(row.isVerified.toLowerCase());
    return row;
  });
}

const DEFAULT_CATEGORIES = [
  "Vegetables & Curries", "Rice & Grains", "Dal & Legumes", "Indian Breads",
  "Beverages", "Non-Vegetarian", "Fast Food & Bakery", "Sweets & Desserts",
  "Supplements & Protein", "Snacks", "Fruits", "Dairy",
];

function ManualAddSection({ categories }) {
  const [form, setForm] = useState({
    name: "", brand: "", category: categories[0] || "Vegetables & Curries",
    servingSize: 100, servingUnit: "g", caloriesPer: "",
    proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0, sugarG: 0, sodiumMg: 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (e) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === "number" ? (value === "" ? "" : Number(value)) : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || form.name.trim().length < 2) return toast.error("Name must be at least 2 chars");
    if (!form.caloriesPer || form.caloriesPer <= 0) return toast.error("Calories must be > 0");
    setSaving(true);
    try {
      await foodAPI.create(form);
      toast.success(`"${form.name}" added to database!`);
      setForm(p => ({ ...p, name: "", brand: "", caloriesPer: "", proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0, sugarG: 0, sodiumMg: 0 }));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add food");
    } finally { setSaving(false); }
  };

  const labelStyle = { color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Row 1: Name + Brand */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Food Name *</label>
          <input name="name" value={form.name} onChange={set} required placeholder="e.g. Paneer Tikka" className="input-field mt-1" />
        </div>
        <div>
          <label style={labelStyle}>Brand</label>
          <input name="brand" value={form.brand} onChange={set} placeholder="Optional" className="input-field mt-1" />
        </div>
      </div>

      {/* Row 2: Category + Serving */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label style={labelStyle}>Category</label>
          <select name="category" value={form.category} onChange={set} className="input-field mt-1">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Serving Size</label>
          <input type="number" name="servingSize" value={form.servingSize} onChange={set} min="1" className="input-field mt-1" />
        </div>
        <div>
          <label style={labelStyle}>Unit</label>
          <select name="servingUnit" value={form.servingUnit} onChange={set} className="input-field mt-1">
            {["g","ml","piece","katori","cup","glass","bowl","plate","slice","tbsp","tsp"].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Row 3: Calories */}
      <div>
        <label style={labelStyle}>Calories per serving *</label>
        <input type="number" name="caloriesPer" value={form.caloriesPer} onChange={set} min="0" required placeholder="kcal" className="input-field mt-1" />
      </div>

      {/* Row 4: Macros grid */}
      <div>
        <label style={labelStyle}>Macronutrients (per serving)</label>
        <div className="grid grid-cols-3 gap-3 mt-1.5">
          <div>
            <label style={{ ...labelStyle, fontSize: '10px' }}>Protein (g)</label>
            <input type="number" name="proteinG" value={form.proteinG} onChange={set} min="0" step="0.1" placeholder="0" className="input-field mt-1" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '10px' }}>Carbs (g)</label>
            <input type="number" name="carbsG" value={form.carbsG} onChange={set} min="0" step="0.1" placeholder="0" className="input-field mt-1" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '10px' }}>Fat (g)</label>
            <input type="number" name="fatG" value={form.fatG} onChange={set} min="0" step="0.1" placeholder="0" className="input-field mt-1" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '10px' }}>Fibre (g)</label>
            <input type="number" name="fibreG" value={form.fibreG} onChange={set} min="0" step="0.1" placeholder="0" className="input-field mt-1" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '10px' }}>Sugar (g)</label>
            <input type="number" name="sugarG" value={form.sugarG} onChange={set} min="0" step="0.1" placeholder="0" className="input-field mt-1" />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '10px' }}>Sodium (mg)</label>
            <input type="number" name="sodiumMg" value={form.sodiumMg} onChange={set} min="0" step="1" placeholder="0" className="input-field mt-1" />
          </div>
        </div>
      </div>

      <button disabled={saving} type="submit"
        className="w-full py-3 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--green-primary)", color: "var(--text-on-green)", border: "none" }}>
        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Plus className="w-4 h-4" /> Add to Database</>}
      </button>
    </form>
  );
}

export default function AdminBulkUpload() {
  const { user } = useUser();
  const [tab, setTab] = useState("manual"); // "manual" | "csv"
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    foodAPI.getCategories().then(res => {
      if (res.data.categories?.length) setCategories(res.data.categories);
    }).catch(() => {});
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) return toast.error("Only .csv files are accepted");
    setFileName(file.name);
    setCsvText(await file.text());
    setResult(null);
  };

  const handleCsvUpload = async () => {
    if (!csvText.trim()) return toast.error("Import a CSV file first");
    try {
      const items = parseCsv(csvText);
      if (!items.length) return toast.error("No valid rows found");
      setIsUploading(true);
      const res = await adminAPI.bulkUploadFoods(items, "csv");
      setResult(res.data);
      toast.success(`Inserted ${res.data.insertedCount || 0} items`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Upload failed");
    } finally { setIsUploading(false); }
  };

  if (!user?.isAdmin) {
    return (
      <div className="page-container animate-fade-in">
        <div className="card p-6 text-center" style={{ border: "1px dashed var(--border-default)" }}>
          <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Admin Access Required</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>You need admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-lg mx-auto" style={{ background: "var(--bg-page)" }}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5" style={{ color: "var(--green-primary)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Admin Panel</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Manage the food database — add items or bulk upload via CSV.</p>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 flex gap-2 mb-4">
        {[
          { key: "manual", label: "Manual Add", icon: Plus },
          { key: "csv", label: "CSV Upload", icon: FileSpreadsheet },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            className="filter-chip flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
            style={{
              background: tab === t.key ? "var(--green-primary)" : "var(--surface-3)",
              color: tab === t.key ? "var(--text-on-green)" : "var(--text-secondary)",
              borderColor: tab === t.key ? "transparent" : "var(--border-default)",
            }}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {tab === "manual" ? (
          <div className="card p-4 food-card-cascade" style={{ animationDelay: "0ms" }}>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Plus className="w-4 h-4" style={{ color: "var(--green-primary)" }} /> Add Food Item
            </h2>
            <ManualAddSection categories={categories} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* CSV Upload Card */}
            <div className="card p-4 food-card-cascade" style={{ animationDelay: "0ms" }}>
              <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--green-primary)" }} /> Upload CSV File
              </h2>

              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                CSV must have headers: name, category, servingSize, servingUnit, caloriesPer, proteinG, carbsG, fatG, fibreG, sugarG, sodiumMg, brand, isVerified
              </p>

              {/* File Drop Zone */}
              <label className="block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all hover:border-[var(--green-primary)]"
                style={{ borderColor: fileName ? "var(--green-primary)" : "var(--border-default)", background: fileName ? "var(--green-subtle)" : "transparent" }}>
                <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
                {fileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" style={{ color: "var(--green-primary)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--green-text)" }}>{fileName}</span>
                    <button onClick={(e) => { e.preventDefault(); setFileName(""); setCsvText(""); setResult(null); }}
                      className="ml-2 p-1 rounded-full" style={{ color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Click to select a .csv file</p>
                  </>
                )}
              </label>

              <button onClick={handleCsvUpload} disabled={isUploading || !csvText.trim()}
                className="w-full mt-4 py-3 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "var(--green-primary)", color: "var(--text-on-green)", border: "none" }}>
                {isUploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload to Database</>}
              </button>
            </div>

            {/* Result Card */}
            {result && (
              <div className="card p-4 food-card-cascade" style={{ animationDelay: "80ms", borderLeft: "4px solid var(--green-primary)" }}>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: "var(--green-primary)" }} /> Upload Result
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Inserted", result.insertedCount || 0, "var(--green-subtle)", "var(--green-text)"],
                    ["Duplicates", result.duplicateCount || 0, "var(--surface-3)", "var(--text-secondary)"],
                    ["Invalid", result.invalidCount || 0, result.invalidCount > 0 ? "#fef2f2" : "var(--surface-3)", result.invalidCount > 0 ? "#dc2626" : "var(--text-secondary)"],
                  ].map(([label, count, bg, color]) => (
                    <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
                      <p className="text-xl font-black" style={{ color }}>{count}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
                    </div>
                  ))}
                </div>
                {result.invalidCount > 0 && result.invalidItems?.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg text-xs space-y-1" style={{ background: "#fef2f2" }}>
                    <p className="font-semibold flex items-center gap-1" style={{ color: "#dc2626" }}><AlertTriangle className="w-3 h-3" /> Invalid rows:</p>
                    {result.invalidItems.slice(0, 5).map((item, i) => (
                      <p key={i} style={{ color: "var(--text-muted)" }}>Row {item.index + 1}: {item.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
