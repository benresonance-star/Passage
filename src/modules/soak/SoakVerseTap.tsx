"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { tokenizeVerse } from "./tokenize";
import type { SoakSection } from "./types";
import "./breathe.css";

/* ─── Timing constants (ms) ──────────────────────────────────────── */

const FADE_OUT_MS = 400;
const PAUSE_MS = 400;
const FADE_IN_MS = 1100;
const COOLDOWN_MS = 1500;

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
      // Safety: only from visible phase (caller also checks, belt-and-suspenders)
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
          // Old verse has faded; swap content while invisible
          return {
            ...state,
            phase: "pause",
            displayedIndex: state.currentIndex,
          };
        case "pause":
          // Content swapped; begin fade-in
          return { ...state, phase: "fade-in" };
        case "fade-in":
          // Verse fully visible; start cooldown clock
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
  /** Called when the user navigates past the first/last verse. */
  onExit?: () => void;
}

export function SoakVerseTap({
  section,
  fontClassName = "",
  onExit,
}: SoakVerseTapProps) {
  const bgRef = useRef<HTMLDivElement>(null);

  // Initial phase is "pause" so the first verse fades in on mount
  const [state, dispatch] = useReducer(soakReducer, {
    currentIndex: 0,
    displayedIndex: 0,
    phase: "pause" as Phase,
    highlightedWords: new Set<number>(),
    lastChangeTs: 0,
  });

  /* ── Transition timer: advances through fade-out → pause → fade-in → visible ── */
  useEffect(() => {
    if (state.phase === "visible") return;

    const duration =
      state.phase === "fade-out"
        ? FADE_OUT_MS
        : state.phase === "pause"
        ? PAUSE_MS
        : FADE_IN_MS;

    const timer = setTimeout(
      () => dispatch({ type: "PHASE_COMPLETE" }),
      duration,
    );
    return () => clearTimeout(timer);
  }, [state.phase]);

  /* ── Navigation handler ──────────────────────────────────────────── */
  const handleNav = useCallback(
    (direction: 1 | -1) => {
      // Guard: transition running
      if (state.phase !== "visible") return;
      // Guard: cooldown
      if (Date.now() - state.lastChangeTs < COOLDOWN_MS) return;

      const newIndex = state.currentIndex + direction;

      // Past-the-edge: exit soak mode
      if (newIndex < 0 || newIndex >= section.verses.length) {
        onExit?.();
        return;
      }

      dispatch({ type: "NAVIGATE", direction });
    },
    [state.phase, state.lastChangeTs, state.currentIndex, section.verses.length, onExit],
  );

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

  const opacity = state.phase === "fade-out" || state.phase === "pause" ? 0 : 1;
  const transitionDuration =
    state.phase === "fade-out"
      ? `${FADE_OUT_MS}ms`
      : state.phase === "fade-in"
      ? `${FADE_IN_MS}ms`
      : "0ms";

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div
      ref={bgRef}
      data-testid="soak-breathe"
      className="soak-breathe"
    >
      {/* Tap zones — below the text layer so word clicks take priority */}
      <div className="fixed inset-0 z-[51] flex" data-testid="soak-zones">
        <div
          className="w-[30%] h-full"
          data-testid="soak-zone-left"
          onClick={() => handleNav(-1)}
        />
        <div
          className="w-[40%] h-full"
          data-testid="soak-zone-center"
        />
        <div
          className="w-[30%] h-full"
          data-testid="soak-zone-right"
          onClick={() => handleNav(1)}
        />
      </div>

      {/* Verse text layer — pointer-events-none lets non-word taps fall to zones */}
      <div
        className={`fixed inset-0 z-[52] flex items-center justify-center px-8 pointer-events-none ${fontClassName}`}
      >
        <p
          className="soak-verse soak-text max-w-lg"
          style={{ opacity, transitionDuration }}
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
    </div>
  );
}

