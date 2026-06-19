import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Search, SearchX } from "lucide-react";
import { foodAPI } from "../utils/api";
import useModalHistory from "../hooks/useModalHistory";

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

function SkeletonPulse({ count = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse h-[52px] rounded-xl"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export default function FoodSearchModal({ isOpen, onClose, onSelect, mealType }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const isSearching = debouncedQuery.trim().length > 0;

  // Hardware back / swipe-back closes this sheet instead of leaving the page.
  useModalHistory(isOpen, onClose);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Open/close lifecycle + load categories for browsing
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setSelectedCategory(null);
      return;
    }

    document.body.classList.add("modal-open");
    let active = true;
    foodAPI
      .getCategories()
      .then((res) => {
        if (active) setCategories(res.data.categories || []);
      })
      .catch(() => {});

    return () => {
      active = false;
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  // Fetch list: search results when typing, otherwise browse the selected section
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const fetchList = async () => {
      setIsLoading(true);
      try {
        const res = isSearching
          ? await foodAPI.search(debouncedQuery)
          : await foodAPI.search("", selectedCategory);
        if (active) setResults(res.data.results || []);
      } catch (error) {
        console.error("Food search failed:", error);
        if (active) setResults([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchList();
    return () => {
      active = false;
    };
  }, [isOpen, debouncedQuery, selectedCategory, isSearching]);

  if (!isOpen) return null;

  // Render inside the app shell (not document.body) so the fixed overlay is
  // bounded to the mobile-shell width instead of the full browser window.
  const portalTarget =
    (typeof document !== "undefined" && document.querySelector(".app-mobile-shell")) || document.body;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div
        className="relative w-full h-full overflow-hidden animate-panel-push flex flex-col"
        style={{
          background: "var(--bg-page)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h3 className="font-bold text-text capitalize">Add to {mealType || "meal"}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 no-spring flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted z-10" />
            <input
              type="text"
              placeholder="Search food..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field search-input-focus pl-10 pr-9"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted no-spring"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips (browse by section) — hidden while actively searching */}
        {!isSearching && categories.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar flex-shrink-0">
            {[{ label: "All", value: null }, ...categories.map(c => ({ label: c, value: c }))].map((item) => {
              const isActive = selectedCategory === item.value;
              return (
                <button
                  key={item.value ?? "__all__"}
                  onClick={() => setSelectedCategory(item.value)}
                  className="filter-chip flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all duration-150 active:scale-95"
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
        )}

        {/* Results / browse list */}
        <div className="px-4 py-3 overflow-y-auto flex-1">
          {isLoading ? (
            <SkeletonPulse count={5} />
          ) : results.length > 0 ? (
            <div className="space-y-2" key={`${debouncedQuery}-${selectedCategory}`}>
              {results.map((food, index) => (
                <button
                  key={food.id}
                  onClick={() => onSelect(food)}
                  className="food-card-cascade food-card-hover no-spring w-full text-left px-3 py-3 rounded-xl flex items-center justify-between gap-3"
                  style={{
                    animationDelay: `${Math.min(index, 12) * 40}ms`,
                    background: "rgba(125,140,170,0.06)",
                    border: "1px solid var(--lg-border)",
                    borderLeft: "4px solid var(--green-primary)",
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-text truncate">
                      {highlightMatch(food.name, debouncedQuery)}
                    </p>
                    <p className="text-xs text-muted truncate">{food.category}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-primary">{Math.round((food.caloriesPer / (food.servingSize || 100)) * 100)} kcal</p>
                    <p className="text-[10px] text-muted">per 100{food.servingUnit || "g"}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 animate-fade-in">
              <div className="flex justify-center mb-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "var(--lg-tint)", border: "1px solid var(--lg-border)", boxShadow: "inset 0 1px 0 var(--lg-hl-top)" }}
                >
                  <SearchX className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
              <p className="text-sm text-muted">
                {isSearching ? <>No foods found for &quot;{debouncedQuery}&quot;</> : "No foods in this section yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    portalTarget
  );
}
