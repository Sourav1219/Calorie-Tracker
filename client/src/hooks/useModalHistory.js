import { useEffect, useRef } from "react";

/**
 * Wire modals/overlays into the browser history stack so the device's
 * hardware back button (Android) or the swipe-back gesture (iOS) closes the
 * top-most modal instead of navigating the SPA route away.
 *
 * Without this, opening a modal on, say, /log and pressing back navigates the
 * router to the previous page (e.g. the dashboard) while the modal is still
 * mounted — the user "loses their place" instead of just dismissing the popup.
 *
 * Implementation note: a single shared stack + one popstate listener is used
 * (rather than one listener per modal). When a modal closes programmatically
 * (button, backdrop, add action) we undo our history entry with history.back(),
 * which itself fires popstate — if every modal had its own listener, that
 * synthetic popstate would be caught by the next modal down and wrongly close
 * it too. The shared coordinator suppresses popstates it triggers itself, so
 * only genuine back presses peel modals off, one layer at a time.
 */

const modalStack = []; // entries pushed in open order; the last is the top-most
let suppressCount = 0; // popstate events to ignore because we triggered them
let listenerAttached = false;

function handlePopState() {
  // Ignore the popstate(s) produced by our own programmatic history.back().
  if (suppressCount > 0) {
    suppressCount -= 1;
    return;
  }
  // Genuine back press / swipe — dismiss the top-most modal.
  const top = modalStack.pop();
  if (top) top.close();
}

function ensureListener() {
  if (!listenerAttached && typeof window !== "undefined") {
    window.addEventListener("popstate", handlePopState);
    listenerAttached = true;
  }
}

function openModal(entry) {
  ensureListener();
  modalStack.push(entry);
  window.history.pushState({ pureintakeModal: true }, "");
}

function closeModal(entry) {
  const idx = modalStack.lastIndexOf(entry);
  // Already removed by a back navigation — nothing to undo.
  if (idx === -1) return;
  modalStack.splice(idx, 1);
  // Remove the matching history entry we pushed; the resulting popstate is
  // ours, so flag it to be ignored. (Same URL → no real route change.)
  suppressCount += 1;
  window.history.back();
}

/**
 * @param {boolean} isOpen   Whether the modal is currently open.
 * @param {() => void} onClose Called when a back press dismisses it.
 */
export default function useModalHistory(isOpen, onClose) {
  // Keep the latest onClose without re-running the effect (which would push a
  // fresh history entry on every render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const entry = { close: () => onCloseRef.current?.() };
    openModal(entry);

    return () => closeModal(entry);
  }, [isOpen]);
}
