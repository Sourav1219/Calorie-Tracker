import { useState, useEffect, useRef } from "react";
import { X, Plus, GripVertical, Trash2 } from "lucide-react";
import { useMealSections } from "../context/MealSectionContext";
import MealIcon from "./MealIcon";

/**
 * Keyword → emoji map for auto-icon assignment.
 * The first match (case-insensitive) wins.
 */
const ICON_KEYWORDS = [
  // Time-of-day / meals
  { keywords: ["breakfast", "morning", "brunch"], icon: "🌅" },
  { keywords: ["lunch", "midday", "noon", "afternoon meal"], icon: "☀️" },
  { keywords: ["dinner", "supper", "evening meal"], icon: "🌙" },
  { keywords: ["snack", "munchies", "nibble"], icon: "🍿" },
  { keywords: ["night", "midnight", "late night", "bedtime"], icon: "🌃" },
  { keywords: ["dawn", "early morning", "sunrise"], icon: "🌄" },
  { keywords: ["brunch"], icon: "🥂" },

  // Workout / fitness
  { keywords: ["pre-workout", "pre workout", "preworkout"], icon: "🏋️" },
  { keywords: ["post-workout", "post workout", "postworkout", "recovery"], icon: "💪" },
  { keywords: ["workout", "exercise", "gym", "training"], icon: "🏃" },
  { keywords: ["protein", "shake", "smoothie"], icon: "🥤" },

  // Drinks
  { keywords: ["tea", "chai"], icon: "🍵" },
  { keywords: ["coffee", "espresso", "latte"], icon: "☕" },
  { keywords: ["juice", "drink", "beverage"], icon: "🧃" },
  { keywords: ["water"], icon: "💧" },

  // Meal types
  { keywords: ["dessert", "sweet", "treat", "cake", "ice cream"], icon: "🍰" },
  { keywords: ["salad", "greens", "veggies"], icon: "🥗" },
  { keywords: ["fruit", "fruits"], icon: "🍎" },
  { keywords: ["soup", "broth"], icon: "🍲" },
  { keywords: ["bread", "toast", "roti", "naan"], icon: "🍞" },
  { keywords: ["rice", "biryani", "pulao"], icon: "🍚" },
  { keywords: ["egg", "omelette", "omelet"], icon: "🥚" },
  { keywords: ["fast", "fasting", "intermittent"], icon: "⏰" },
  { keywords: ["cheat", "cheat meal", "cheat day"], icon: "🎉" },
  { keywords: ["supplement", "vitamin", "pill", "medicine"], icon: "💊" },
];

const DEFAULT_ICON = "🍽️";

/**
 * Given a section name, returns the best-matching emoji icon.
 */
function getAutoIcon(name) {
  if (!name) return DEFAULT_ICON;
  const lower = name.toLowerCase().trim();

  for (const entry of ICON_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return entry.icon;
      }
    }
  }

  return DEFAULT_ICON;
}

export default function MealSectionSheet({ isOpen, onClose }) {
  const { sections, addSection, updateSection, removeSection, reorderSections } = useMealSections();
  const [localSections, setLocalSections] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  
  // New section input state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(DEFAULT_ICON);
  const newNameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSections([...sections]);
      setIsAdding(false);
      setNewName("");
      setNewIcon(DEFAULT_ICON);
    }
  }, [isOpen, sections]);

  // Auto-update icon as the user types a new section name
  useEffect(() => {
    if (isAdding) {
      setNewIcon(getAutoIcon(newName));
    }
  }, [newName, isAdding]);

  if (!isOpen) return null;

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const newSections = [...localSections];
    const draggedItem = newSections[draggedIdx];
    newSections.splice(draggedIdx, 1);
    newSections.splice(index, 0, draggedItem);

    setLocalSections(newSections);
    setDraggedIdx(index);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    const orderIds = localSections.map((s) => s._id);
    await reorderSections(orderIds);
  };

  const handleUpdateName = async (id, name) => {
    if (!name.trim()) return;
    const autoIcon = getAutoIcon(name);
    await updateSection(id, { name: name.trim(), icon: autoIcon });
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      setIsAdding(false);
      return;
    }
    const icon = getAutoIcon(newName);
    await addSection(newName.trim(), icon);
    setNewName("");
    setNewIcon(DEFAULT_ICON);
    setIsAdding(false);
  };

  return (
    <>
      {/* Combined Overlay and Modal Wrapper */}
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 pb-24 pt-6 animate-overlay-fade"
        style={{ background: "var(--bg-modal-overlay)" }}
      >
        <div 
          className="absolute inset-0"
          onClick={onClose}
        />
        
        {/* Modal Body */}
        <div 
          className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-popup-scale max-h-full"
          style={{ 
            background: "var(--bg-page)", 
            border: "1px solid var(--border-default)",
            maxHeight: "75vh",
            boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.1)"
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-5 py-4" style={{ borderBottom: "1px solid var(--border-default)" }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Manage meal sections</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Drag to reorder • Icons auto-match</p>
            </div>
            <button 
              onClick={onClose} 
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="px-5 py-4 overflow-y-auto flex-1">
            <div className="space-y-2.5">
              {localSections.map((section, index) => (
                <div 
                  key={section._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-150"
                  style={{
                    borderColor: draggedIdx === index ? "var(--green-primary)" : "var(--border-default)",
                    background: draggedIdx === index ? "var(--green-subtle)" : "var(--surface-1)",
                    opacity: draggedIdx === index ? 0.7 : 1,
                    transform: draggedIdx === index ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="cursor-grab active:cursor-grabbing p-0.5" style={{ color: "var(--text-muted)" }}>
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <MealIcon name={section.name} fallbackEmoji={section.icon || DEFAULT_ICON} />
                    </span>
                    <input 
                      type="text" 
                      defaultValue={section.name}
                      onBlur={(e) => {
                        if (e.target.value !== section.name) {
                          handleUpdateName(section._id, e.target.value);
                        }
                      }}
                      className="flex-1 bg-transparent border-none focus:ring-0 font-medium text-sm p-0 m-0 w-full outline-none"
                      style={{ color: "var(--text-primary)" }}
                      maxLength={30}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (sections.length <= 1) return;
                      if (window.confirm(`Delete "${section.name}"? Logged items under this section will appear as "Deleted section" in history.`)) {
                        removeSection(section._id);
                      }
                    }}
                    disabled={sections.length <= 1}
                    className={`p-1.5 rounded-lg transition-colors ${sections.length <= 1 ? "opacity-20 cursor-not-allowed" : "hover:bg-red-50 text-red-500"}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add new section row */}
              {isAdding ? (
                <div 
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
                  style={{ borderColor: "var(--green-primary)", background: "var(--green-subtle)" }}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="p-0.5 opacity-0"><GripVertical className="w-4 h-4" /></div>
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-all duration-200">
                      <MealIcon name={newName} fallbackEmoji={newIcon} />
                    </span>
                    <input 
                      ref={newNameRef}
                      autoFocus
                      type="text" 
                      placeholder="e.g. Night Snacks, Pre-workout..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                      onBlur={() => {
                        if (!newName.trim()) setIsAdding(false);
                      }}
                      className="flex-1 bg-transparent border-none focus:ring-0 font-medium text-sm p-0 m-0 w-full outline-none"
                      style={{ color: "var(--text-primary)" }}
                      maxLength={30}
                    />
                  </div>
                  <button 
                    onMouseDown={handleAdd}
                    className="px-3 py-1 rounded-lg font-semibold text-xs transition-colors"
                    style={{ background: "var(--green-primary)", color: "var(--text-on-green)" }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    if (sections.length >= 10) {
                      alert("You've reached the limit of 10 sections.");
                      return;
                    }
                    setIsAdding(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed transition-all duration-200 hover:border-green-400 hover:bg-green-50/50"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-muted)", background: "transparent" }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add section</span>
                </button>
              )}
            </div>

            {/* Auto-icon hint */}
            <p className="text-[11px] mt-4 text-center" style={{ color: "var(--text-muted)" }}>
              💡 Icons auto-match keywords like "breakfast", "night", "workout", "tea" etc.
            </p>
          </div>
          
          {/* Footer */}
          <div className="px-5 py-3.5" style={{ borderTop: "1px solid var(--border-default)" }}>
            <button 
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
              style={{ background: "var(--green-primary)", color: "var(--text-on-green)" }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
