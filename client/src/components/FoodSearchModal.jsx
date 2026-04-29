import { useEffect, useState } from "react";
import { X, Search, SearchX } from "lucide-react";
import { foodAPI } from "../utils/api";

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

function SkeletonPulse({ count = 3 }) {
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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const res = await foodAPI.search(debouncedQuery);
        setResults(res.data.results || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
    } else {
      // Prevent body scroll and signal modal is open
      document.body.classList.add("modal-open");
      return () => document.body.classList.remove("modal-open");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-[24px] sm:rounded-[24px] max-h-[85dvh] sm:max-h-[80vh] overflow-hidden animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-text capitalize">Add to {mealType || "meal"}</h3>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search food..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field search-input-focus pl-10"
              autoFocus
            />
          </div>
        </div>
        {/* Results */}
        <div className="px-4 pb-4 overflow-y-auto max-h-[50vh]">
          {isLoading ? (
            <SkeletonPulse count={4} />
          ) : results.length > 0 ? (
            <div className="space-y-1" key={debouncedQuery}>
              {results.map((food, index) => (
                <button
                  key={food.id}
                  onClick={() => onSelect(food)}
                  className="food-card-cascade food-card-hover w-full text-left px-3 py-3 rounded-xl flex items-center justify-between gap-3"
                  style={{
                    animationDelay: `${index * 40}ms`,
                    background: "transparent",
                    border: "1px solid transparent",
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
          ) : query.trim() ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="flex justify-center mb-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "var(--surface-3)" }}
                >
                  <SearchX className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
              <p className="text-sm text-muted">
                No foods found for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-muted py-8">Type to search from 800+ foods</p>
          )}
        </div>
      </div>
    </div>
  );
}
