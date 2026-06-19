/**
 * Tiny in-memory, per-session cache for page data.
 *
 * Navigating between tabs unmounts/remounts each page, which otherwise resets
 * its state — so every revisit flashes a loading skeleton and replays intro
 * animations from zero. By stashing the last-known data here and seeding a
 * page's state from it on mount, a revisit renders the previous data instantly
 * ("already there") while a background refresh keeps it current
 * (stale-while-revalidate). Cleared on a full page reload, which is fine — the
 * one-time intro animation is welcome on a cold load, just not on every visit.
 */
const store = new Map();

export function getCache(key) {
  return store.get(key);
}

export function hasCache(key) {
  return store.has(key);
}

export function setCache(key, value) {
  store.set(key, value);
}

export function clearCache(key) {
  if (key === undefined) store.clear();
  else store.delete(key);
}
