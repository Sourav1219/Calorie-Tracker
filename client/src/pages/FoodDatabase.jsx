import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Plus, Search, X, SearchX } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { foodAPI, mealsAPI } from "../utils/api";
import { useMealSections } from "../context/MealSectionContext";
import FoodCard from "../components/NutritionCard";
import FoodDetailModal from "../components/FoodDetailModal";
import AddCustomFoodForm from "../components/AddCustomFoodForm";

function SkeletonPulse({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse p-4 h-[90px]"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export default function FoodDatabase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mealFromQuery = searchParams.get("meal");
  const { sections } = useMealSections();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const lastAction = useRef("search");

  const [foods, setFoods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [totalFoodCount, setTotalFoodCount] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await foodAPI.getCategories();
        setCategories(res.data.categories || []);
        if (res.data.totalCount !== undefined) {
          setTotalFoodCount(res.data.totalCount);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const scrollToCategory = (cat) => {
    setTimeout(() => {
      const id = cat ? `cat-${cat.replace(/\s+/g, '-')}` : 'cat-all';
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
  };

  useEffect(() => {
    let active = true;

    const fetchFoods = async () => {
      setIsLoading(true);
      try {
        let q = debouncedQuery;
        let cat = selectedCategory;

        if (lastAction.current === "search") {
          if (q) {
            const res = await foodAPI.search(q, null); // Find best category unconstrained
            if (!active) return;
            const results = res.data.results || [];
            
            if (results.length > 0) {
              const bestCat = results[0].category;
              cat = bestCat;
              lastAction.current = "auto_tab";
              setSelectedCategory(bestCat);
              scrollToCategory(bestCat);
              
              // Only display results for this specific matched category
              setFoods(results.filter(f => f.category === bestCat));
            } else {
              setFoods([]);
            }
          } else {
            // Cleared search -> show items of the current selected category
            const res = await foodAPI.search("", cat);
            if (!active) return;
            setFoods(res.data.results || []);
          }
          setIsLoading(false);
          return;
        }

        // Action is "tab" or "auto_tab" refetch
        if (lastAction.current === "tab") {
          if (cat === null) {
            // Clicked "All" -> display search results for current query
            const res = await foodAPI.search(q, null);
            if (!active) return;
            setFoods(res.data.results || []);
          } else {
            // Clicked specific section (e.g. Beverages) -> display all items of that section, ignoring search text
            const res = await foodAPI.search("", cat);
            if (!active) return;
            setFoods(res.data.results || []);
          }
        } else {
          // auto_tab or other triggers
          const res = await foodAPI.search(q, cat);
          if (!active) return;
          setFoods(res.data.results || []);
        }

      } catch (error) {
        console.error("Failed to fetch foods:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchFoods();
    
    return () => { active = false; };
  }, [debouncedQuery, selectedCategory, refreshTrigger]);

  const handleAddToMeal = async (food, quantity, unit, mealType) => {
    // Determine the section ID to log to. Fallback to first section if nothing specified.
    const targetSectionId = String(mealType || mealFromQuery || (sections[0]?._id) || "snacks").trim();
    const section = sections.find(s => s._id === targetSectionId);
    const sectionName = section ? section.name : "Meal";

    // The detail popup closes instantly (fire-and-forget) so it no longer
    // surfaces errors — handle them here.
    try {
      await mealsAPI.create({ foodItemId: food.id, quantity, unit, mealType: targetSectionId });
      toast.success(`${food.name} added to ${sectionName}`);
      navigate(`/log?meal=${targetSectionId}`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add food");
    }
  };

  return (
    <>
      <div className="pb-24 max-w-lg mx-auto" style={{ background: "var(--bg-page)" }}>
        <div
          className="px-4 pt-6 pb-4 sticky top-0 z-30"
          style={{
            background: "var(--bg-page)",
            borderBottom: "1px solid var(--lg-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <span>🥗</span>
              Food Database
            </h1>
            <span
              className="text-xs font-semibold px-2 py-1 rounded-md border flex items-center gap-1"
              style={{
                background: "var(--green-subtle)",
                color: "var(--green-text)",
                borderColor: "var(--green-border)",
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              {totalFoodCount > 0 ? `${totalFoodCount} Foods` : "Loading..."}
            </span>
          </div>

          {mealFromQuery && (
            <div
              className="mb-4 rounded-xl px-4 py-2.5 text-sm font-medium capitalize"
              style={{ background: "var(--green-subtle)", color: "var(--green-text)", border: "1px solid var(--green-border)" }}
            >
              Adding food to <strong>{sections.find(s => s._id === mealFromQuery)?.name || "Meal"}</strong>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search roti, dal, rice..."
              value={searchQuery}
              onChange={(e) => {
                lastAction.current = "search";
                setSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  lastAction.current = "search";
                  setRefreshTrigger(prev => prev + 1);
                  e.target.blur(); // Optional: remove focus after search
                }
              }}
              className="input-field search-input-focus rounded-full pl-11 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  lastAction.current = "search";
                  setSearchQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors no-spring"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 hide-scrollbar">
            {[{ label: "All", value: null }, ...categories.map(c => ({ label: c, value: c }))].map((item) => {
              const isActive = selectedCategory === item.value;
              return (
                <button
                  key={item.value ?? "__all__"}
                  id={item.value ? `cat-${item.value.replace(/\s+/g, '-')}` : "cat-all"}
                  onClick={() => {
                    lastAction.current = "tab";
                    setSelectedCategory(item.value);
                  }}
                  className="filter-chip flex-shrink-0 w-[110px] px-2 py-1.5 rounded-full text-sm font-bold border truncate transition-all duration-150 active:scale-95"
                  style={{
                    background: isActive
                      ? "linear-gradient(180deg, rgba(34,197,94,0.28), rgba(34,197,94,0.14))"
                      : "var(--tab-inactive-bg)",
                    color: isActive ? "var(--green-primary)" : "var(--tab-inactive-color)",
                    borderColor: isActive ? "rgba(34,197,94,0.40)" : "var(--tab-inactive-border)",
                    boxShadow: isActive
                      ? "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 10px rgba(34,197,94,0.18)"
                      : "var(--tab-inactive-shadow)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-4">
          {isLoading ? (
            <SkeletonPulse count={5} />
          ) : foods.length > 0 ? (
            <div className="space-y-3" key={`${debouncedQuery}-${selectedCategory}`}>
              {foods.map((food, index) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  onSelect={(f) => setSelectedFood(f)}
                  searchQuery={debouncedQuery}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 px-4 animate-fade-in">
              <div className="flex justify-center mb-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)" }}
                >
                  <SearchX className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                No foods found
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                {searchQuery
                  ? <>We couldn&apos;t find anything matching &quot;{searchQuery}&quot;.</>
                  : "No items in this category yet."
                }
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 font-semibold rounded-xl px-4 py-2.5 transition-all active:scale-[0.97]"
                style={{
                  background: "var(--green-primary)",
                  color: "var(--text-on-green)",
                  border: "none",
                }}
              >
                <Plus className="w-4 h-4" /> Add it yourself
              </button>
            </div>
          )}
        </div>


      </div>

      <FoodDetailModal food={selectedFood} onClose={() => setSelectedFood(null)} onAddToMeal={handleAddToMeal} targetSectionId={mealFromQuery} />
      {showAddForm && (
        <AddCustomFoodForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </>
  );
}
