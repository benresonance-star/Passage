"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { tokenizeVerse } from "./tokenize";
import type { SoakSection } from "./types";
import { X } from "lucide-react";
import "./breathe.css";

/* ─── Timing constants (ms) ──────────────────────────────────────── */

const FADE_OUT_MS = 800;
const PAUSE_MS = 100;
const FADE_IN_MS = 800;
const COOLDOWN_MS = 1200;

/* ─── Swipe constants ────────────────────────────────────────────── */

const SWIPE_THRESHOLD_PX = 50;

/* ─── Exit button constants ──────────────────────────────────────── */

const EXIT_VISIBLE_MS = 3000; // How long the exit icon stays visible after tap

/* ─── State machine ──────────────────────────────────────────────── */

type Phase = "visible" | "fade-out" | "pause" | "fade-in";

interface SoakState {
  /** Target verse index (jumps immediately on NAVIGATE). */
  currentIndex: number;
  /** Verse index currently rendered in the DOM (swaps during pause). */
  displayedIndex: number;
  /** Transition phase. */
  phase: Phase;
  /** Set of highlighted word keys for the current verse. */
  highlightedWords: Set<number>;
  /** Timestamp when the last verse became fully visible. */
  lastChangeTs: number;
}

type SoakAction =
  | { type: "NAVIGATE"; direction: 1 | -1 }
  | { type: "PHASE_COMPLETE" }
  | { type: "TOGGLE_WORD"; key: number };

function soakReducer(state: SoakState, action: SoakAction): SoakState {
  switch (action.type) {
    case "NAVIGATE": {
      if (state.phase !== "visible") return state;
      return {
        ...state,
        currentIndex: state.currentIndex + action.direction,
        phase: "fade-out",
        highlightedWords: new Set(),
      };
    }

    case "PHASE_COMPLETE": {
      switch (state.phase) {
        case "fade-out":
          return {
            ...state,
            phase: "pause",
            displayedIndex: state.currentIndex,
          };
        case "pause":
          return { ...state, phase: "fade-in" };
        case "fade-in":
          return {
            ...state,
            phase: "visible",
            lastChangeTs: Date.now(),
          };
        default:
          return state;
      }
    }

    case "TOGGLE_WORD": {
      const next = new Set(state.highlightedWords);
      if (next.has(action.key)) next.delete(action.key);
      else next.add(action.key);
      return { ...state, highlightedWords: next };
    }

    default:
      return state;
  }
}

/* ─── Component ──────────────────────────────────────────────────── */

export interface SoakVerseTapProps {
  section: SoakSection;
  /** Optional class to apply a custom font (e.g. from next/font). */
  fontClassName?: string;
  /** Called when the user taps the exit icon. */
  onExit?: () => void;
}

export function SoakVerseTap({
  section,
  fontClassName = "",
  onExit,
}: SoakVerseTapProps) {
  const bgRef = useRef<HTMLDivElement>(null);

  /* ── Touch tracking refs ─────────────────────────────────────────── */
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  /** Timestamp of last touch event — used to ignore synthetic mouse clicks on mobile */
  const lastTouchTs = useRef(0);

  /* ── Exit icon visibility ────────────────────────────────────────── */
  const [exitVisible, setExitVisible] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial phase is "pause" so the first verse fades in on mount
  const [state, dispatch] = useReducer(soakReducer, {
    currentIndex: 0,
    displayedIndex: 0,
    phase: "pause" as Phase,
    highlightedWords: new Set<number>(),
    lastChangeTs: 0,
  });

  /* ── Transition timer ────────────────────────────────────────────── */
  useEffect(() => {
    if (state.phase === "visible") return;

    // During the "pause" phase the verse content swaps at opacity 0.
    // We use a double-requestAnimationFrame instead of a fixed timeout
    // so the browser (especially iOS Safari) fully paints the new DOM
    // at opacity 0 before we kick off the fade-in.
    if (state.phase === "pause") {
      let cancelled = false;
      requestAnimationFrame(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          dispatch({ type: "PHASE_COMPLETE" });
        });
      });
      return () => { cancelled = true; };
    }

    const duration = state.phase === "fade-out" ? FADE_OUT_MS : FADE_IN_MS;

    const timer = setTimeout(
      () => dispatch({ type: "PHASE_COMPLETE" }),
      duration,
    );
    return () => clearTimeout(timer);
  }, [state.phase]);

  /* ── Navigation handler ──────────────────────────────────────────── */
  const handleNav = useCallback(
    (direction: 1 | -1) => {
      if (state.phase !== "visible") return;
      if (Date.now() - state.lastChangeTs < COOLDOWN_MS) return;

      const newIndex = state.currentIndex + direction;

      // Past-the-edge: do nothing (exit is via the exit icon now)
      if (newIndex < 0 || newIndex >= section.verses.length) return;

      dispatch({ type: "NAVIGATE", direction });
    },
    [state.phase, state.lastChangeTs, state.currentIndex, section.verses.length],
  );

  /* ── Swipe handlers (mobile) ─────────────────────────────────────── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    lastTouchTs.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      lastTouchTs.current = Date.now();
      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      // Reset
      touchStartX.current = null;
      touchStartY.current = null;

      // Only count horizontal swipes (ignore vertical scrolls)
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      if (deltaX < 0) {
        // Swipe left → next verse
        handleNav(1);
      } else {
        // Swipe right → previous verse
        handleNav(-1);
      }
    },
    [handleNav],
  );

  /* ── Click-zone handler (desktop mouse only) ───────────────────── */
  const handleZoneClick = useCallback(
    (direction: 1 | -1) => {
      // Ignore synthetic clicks fired after a touch event (mobile)
      if (Date.now() - lastTouchTs.current < 800) return;
      handleNav(direction);
    },
    [handleNav],
  );

  /* ── Exit icon: show on tap in bottom area, auto-hide after delay ── */
  const showExitIcon = useCallback(() => {
    setExitVisible(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => setExitVisible(false), EXIT_VISIBLE_MS);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  /* ── Word click handler ──────────────────────────────────────────── */
  const handleWordClick = useCallback(
    (key: number, e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch({ type: "TOGGLE_WORD", key });
    },
    [],
  );

  /* ── Derived values ──────────────────────────────────────────────── */
  const verse = section.verses[state.displayedIndex];
  const tokens = verse ? tokenizeVerse(verse.text) : [];

  /* Inline opacity — iOS Safari requires this instead of class toggles
     for smooth CSS transitions.  0 during fade-out & pause, 1 otherwise. */
  const verseOpacity =
    state.phase === "fade-out" || state.phase === "pause" ? 0 : 1;

  /* ── Verse indicator (e.g. 1 / 5) ───────────────────────────────── */
  const verseIndicator = `${state.displayedIndex + 1} / ${section.verses.length}`;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div
      ref={bgRef}
      data-testid="soak-breathe"
      className="soak-breathe"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Click zones — left/right for desktop mouse nav, center for exit reveal */}
      <div className="fixed inset-0 z-[51] flex" data-testid="soak-click-zones">
        <div
          className="w-[30%] h-full cursor-default"
          data-testid="soak-zone-left"
          onClick={() => handleZoneClick(-1)}
        />
        <div
          className="w-[40%] h-full"
          data-testid="soak-zone-center"
          onClick={showExitIcon}
        />
        <div
          className="w-[30%] h-full cursor-default"
          data-testid="soak-zone-right"
          onClick={() => handleZoneClick(1)}
        />
      </div>

      {/* Verse text layer — breathing wrapper is a SEPARATE composited layer
           from the opacity-transitioning <p> so iOS Safari can GPU-accelerate both. */}
      <div
        className={`fixed inset-0 z-[52] flex items-center justify-center px-8 pointer-events-none soak-breathe-text ${fontClassName}`}
      >
        <p
          className="soak-verse soak-text max-w-lg"
          style={{ opacity: verseOpacity }}
          data-testid="soak-verse"
          aria-live="polite"
        >
          {tokens.map((token) => (
            <span
              key={token.key}
              onClick={(e) => handleWordClick(token.key, e)}
              className={`soak-word pointer-events-auto ${
                state.highlightedWords.has(token.key)
                  ? "soak-word-highlighted"
                  : ""
              }`}
              data-testid={`soak-word-${token.key}`}
              role="button"
              tabIndex={-1}
            >
              {token.text}{" "}
            </span>
          ))}
        </p>
      </div>

      {/* Verse indicator — subtle, always visible */}
      <div
        className="fixed top-0 left-0 right-0 z-[53] flex justify-center pt-safe"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <span
          className="text-[11px] tracking-[0.2em] uppercase font-light soak-verse"
          style={{ color: "rgba(255, 252, 240, 0.3)", opacity: verseOpacity }}
        >
          {verseIndicator}
        </span>
      </div>

      {/* Bottom exit zone — tap to reveal, tap icon to exit */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[53] flex justify-center pb-safe"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
        onClick={(e) => {
          e.stopPropagation();
          if (!exitVisible) {
            showExitIcon();
          }
        }}
        data-testid="soak-exit-zone"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (exitVisible) {
              onExit?.();
            } else {
              showExitIcon();
            }
          }}
          className="p-3 rounded-full transition-all duration-500"
          style={{
            opacity: exitVisible ? 0.7 : 0.12,
            backgroundColor: exitVisible
              ? "rgba(255, 252, 240, 0.12)"
              : "transparent",
            transform: exitVisible ? "scale(1)" : "scale(0.85)",
            transition: "opacity 500ms ease, background-color 500ms ease, transform 300ms ease",
          }}
          data-testid="soak-exit-button"
          aria-label="Exit Soak mode"
        >
          <X
            size={22}
            style={{ color: "rgba(255, 252, 240, 0.85)" }}
          />
        </button>
      </div>
    </div>
  );
}
