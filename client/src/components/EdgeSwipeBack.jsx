import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * System-style edge swipe-to-go-back gesture.
 *
 * A horizontal drag that starts from the very left OR right edge of the screen
 * (covering iOS' left-edge and Android/One UI's either-edge conventions) calls
 * window.history.back() — which, thanks to useModalHistory, dismisses the
 * top-most popup first and otherwise navigates to the previous tab/page. No
 * more reaching for the close button.
 *
 * Care taken: only triggers from an edge, bails the moment the motion looks
 * vertical (so it never hijacks scrolling or pull-to-refresh), follows the
 * finger 1:1, arms past a native-feeling threshold, and snaps back otherwise.
 */

const EDGE_ZONE = 28; // px from a screen edge where a back-swipe may start
const ACTIVATE = 12; // horizontal px travelled before we commit to the gesture
const VERTICAL_SLOP = 10; // if vertical wins this early, it's a scroll — abandon
const HANDLE = 46; // px diameter of the visual handle

// Distance to pull before the gesture arms — ~32% of the viewport, clamped to a
// sane range so it feels the same on a phone and a tablet (like native back).
function triggerDistance() {
  return Math.min(Math.max(window.innerWidth * 0.32, 72), 180);
}

export default function EdgeSwipeBack() {
  const [drag, setDrag] = useState(null); // { edge, travel, progress, y, releasing }
  const gesture = useRef(null);

  useEffect(() => {
    // Non-passive so we can preventDefault the native horizontal swipe; capture
    // so a claimed gesture wins over page handlers (e.g. dashboard date swipe).
    const moveOpts = { passive: false, capture: true };

    function detachDynamic() {
      document.removeEventListener("touchmove", onMove, moveOpts);
      document.removeEventListener("touchend", onEnd, moveOpts);
      document.removeEventListener("touchcancel", onEnd, moveOpts);
    }

    function onStart(e) {
      if (gesture.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      const width = window.innerWidth;
      let edge = null;
      if (t.clientX <= EDGE_ZONE) edge = "left";
      else if (t.clientX >= width - EDGE_ZONE) edge = "right";
      if (!edge) return;

      gesture.current = {
        edge,
        startX: t.clientX,
        startY: t.clientY,
        width,
        trigger: triggerDistance(),
        claimed: false,
      };
      // Only listen for moves once an edge touch actually begins — keeps the
      // global footprint to a single passive touchstart the rest of the time.
      document.addEventListener("touchmove", onMove, moveOpts);
      document.addEventListener("touchend", onEnd, moveOpts);
      document.addEventListener("touchcancel", onEnd, moveOpts);
    }

    function onMove(e) {
      const s = gesture.current;
      if (!s) return;
      const t = e.touches[0];
      const dx = t.clientX - s.startX;
      const dy = t.clientY - s.startY;
      const back = s.edge === "left" ? dx : -dx; // distance in the "back" direction

      if (!s.claimed) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > VERTICAL_SLOP) {
          // Vertical intent → it's a scroll. Let go without ever interfering.
          gesture.current = null;
          detachDynamic();
          return;
        }
        if (back > ACTIVATE) s.claimed = true;
        else return;
      }

      // Claimed: it's a back-swipe — own it.
      e.preventDefault();
      e.stopPropagation();
      const travel = Math.min(Math.max(back, 0), s.trigger);
      setDrag({
        edge: s.edge,
        travel,
        progress: travel / s.trigger,
        y: t.clientY,
        releasing: false,
      });
    }

    function onEnd(e) {
      const s = gesture.current;
      gesture.current = null;
      detachDynamic();
      if (!s || !s.claimed) {
        setDrag(null);
        return;
      }
      e.stopPropagation();
      const t = e.changedTouches?.[0];
      const back = t
        ? s.edge === "left"
          ? t.clientX - s.startX
          : s.startX - t.clientX
        : 0;

      if (back >= s.trigger) {
        // Armed → go back: closes the top popup (via useModalHistory) or
        // navigates to the previous tab/page, exactly like the OS gesture.
        setDrag(null);
        window.history.back();
      } else {
        // Not far enough → glide the handle back out, then unmount.
        setDrag((d) => (d ? { ...d, travel: 0, progress: 0, releasing: true } : null));
        setTimeout(() => setDrag(null), 200);
      }
    }

    document.addEventListener("touchstart", onStart, { passive: true, capture: true });
    return () => {
      document.removeEventListener("touchstart", onStart, { capture: true });
      detachDynamic();
    };
  }, []);

  if (!drag) return null;

  const { edge, travel, progress, y, releasing } = drag;
  const armed = progress >= 1;
  const Chevron = edge === "left" ? ChevronLeft : ChevronRight;
  const edgePos = travel - HANDLE; // handle slides in from its edge as you pull
  const topPos = Math.min(Math.max(y - HANDLE / 2, 12), window.innerHeight - HANDLE - 12);
  const ease =
    "left 0.2s ease, right 0.2s ease, transform 0.2s ease, opacity 0.2s ease, background 0.15s ease";

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 2147483647, pointerEvents: "none" }}>
      {/* Scrim that deepens slightly as the gesture progresses. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: progress * 0.12,
          transition: releasing ? "opacity 0.2s ease" : "none",
        }}
      />
      {/* Glass handle that tracks the finger and turns green once armed. */}
      <div
        style={{
          position: "absolute",
          top: topPos,
          ...(edge === "left" ? { left: edgePos } : { right: edgePos }),
          width: HANDLE,
          height: HANDLE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          color: armed ? "#fff" : "var(--text-primary, #1a1a1a)",
          background: armed
            ? "linear-gradient(180deg, rgba(34,197,94,0.92), rgba(34,197,94,0.78))"
            : "var(--surface-glass, rgba(255,255,255,0.72))",
          border: `1px solid ${armed ? "rgba(34,197,94,0.6)" : "var(--lg-border, rgba(0,0,0,0.08))"}`,
          boxShadow: "0 6px 22px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.45)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transform: `scale(${0.7 + progress * 0.3})`,
          opacity: 0.45 + progress * 0.55,
          transition: releasing ? ease : "background 0.12s ease, color 0.12s ease",
        }}
      >
        <Chevron style={{ width: 24, height: 24 }} strokeWidth={2.5} />
      </div>
    </div>
  );
}
