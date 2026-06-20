/**
 * Cross-tab cache sync for logged meals.
 *
 * The dashboard (`dash:<date>` — a log object with totals + groupedMeals) and
 * the meal log (`meals:<date>` — an array of meals) each cache the same
 * underlying data for instant tab revisits. When a meal is logged or removed on
 * one screen, the OTHER screen's cached snapshot would otherwise stay stale
 * until its next refetch — so revisiting it shows old numbers for a moment
 * before the network catches up (e.g. the calorie ring lagging behind).
 *
 * These helpers patch the *other* screen's cached snapshot immediately, so a
 * later visit is already correct and just animates to the right value. Each
 * screen owns its own cache (it rewrites it wholesale from live state), so it
 * only ever patches the surface it isn't currently showing:
 *   - Meal Log add/delete    → patch the dashboard cache
 *   - Dashboard add          → patch the meal-log cache
 *   - Food DB add (navigates) → patch both
 */
import { getCache, setCache } from "./pageCache";
import { getLocalDateKey } from "./api";

// ── Dashboard log cache (`dash:<date>`) ───────────────────────────────────────
export function dashCacheAddMeal(meal, dateKey = getLocalDateKey()) {
  const key = `dash:${dateKey}`;
  const log = getCache(key);
  if (!log || !meal) return; // not cached yet — its first load will be correct
  const grouped = { ...(log.groupedMeals || {}) };
  grouped[meal.mealType] = [meal, ...(grouped[meal.mealType] || [])];
  setCache(key, {
    ...log,
    totalCalories: (log.totalCalories || 0) + (meal.calories || 0),
    totalProteinG: (log.totalProteinG || 0) + (meal.proteinG || 0),
    totalCarbsG: (log.totalCarbsG || 0) + (meal.carbsG || 0),
    totalFatG: (log.totalFatG || 0) + (meal.fatG || 0),
    meals: [meal, ...(log.meals || [])],
    groupedMeals: grouped,
  });
}

export function dashCacheRemoveMeal(meal, dateKey = getLocalDateKey()) {
  const key = `dash:${dateKey}`;
  const log = getCache(key);
  if (!log || !meal) return;
  const grouped = { ...(log.groupedMeals || {}) };
  for (const k of Object.keys(grouped)) grouped[k] = grouped[k].filter((m) => m.id !== meal.id);
  setCache(key, {
    ...log,
    totalCalories: (log.totalCalories || 0) - (meal.calories || 0),
    totalProteinG: (log.totalProteinG || 0) - (meal.proteinG || 0),
    totalCarbsG: (log.totalCarbsG || 0) - (meal.carbsG || 0),
    totalFatG: (log.totalFatG || 0) - (meal.fatG || 0),
    meals: (log.meals || []).filter((m) => m.id !== meal.id),
    groupedMeals: grouped,
  });
}

// ── Meal-log list cache (`meals:<date>`) ──────────────────────────────────────
export function mealsCacheAddMeal(meal, dateKey = getLocalDateKey()) {
  const key = `meals:${dateKey}`;
  const list = getCache(key);
  if (!Array.isArray(list) || !meal) return;
  setCache(key, [meal, ...list]);
}
