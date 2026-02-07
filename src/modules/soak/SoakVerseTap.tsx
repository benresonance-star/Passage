"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { tokenizeVerse } from "./tokenize";
import type { SoakSection } from "./types";
import { X } from "lucide-react";
import "./breathe.css";

/* ─── Timing constants (ms) ──────────────────────────────────────── */

/** Duration of the crossfade (both directions simultaneous). */
const CROSSFADE_MS = 800;
/** Minimum dwell time on a verse before navigation is allowed. */
const COOLDOWN_MS = 1200;

/* ─── Swipe constants ────────────────────────────────────────────── */

const SWIPE_THRESHOLD_PX = 50;

/* ─── Exit button constants ──────────────────────────────────────── */

const EXIT_VISIBLE_MS = 3000;

/* ─── State machine ──────────────────────────────────────────────── */
/*
 *  Double-buffer crossfade:
 *
 *  Two verse "slots" (A & B) are always in the DOM, overlapping.
 *  Only one is visible at a time (`activeSlot`).
 *
 *  On NAVIGATE the inactive slot receives the new verse index, then:
 *    preparing  → browser paints the new content at opacity 0  (2× rAF)
 *    crossfading → active slot fades out, inactive fades in    (CROSSFADE_MS)
 *    idle        → activeSlot flips to the slot that just faded in
 *
 *  Because the incoming verse is already rendered (at opacity 0)
 *  before the crossfade begins, NO DOM mutation ever happens during
 *  a visible transition — the compositor just interpolates opacity
 *  on two pre-rendered layers. This is silky-smooth on iOS Safari.
 */

type Phase = "idle" | "preparing" | "crossfading";

interface SoakState {
  /** The latest verse index the user navigated to. */
  currentIndex: number;
  /** Which slot is currently the "on-screen" one. */
  activeSlot: "a" | "b";
  /** Verse index loaded in slot A. */
  slotA: number;
  /** Verse index loaded in slot B. */
  slotB: number;
  /** Transition phase. */
  phase: Phase;
  /** Set of highlighted word keys (active slot only). */
  highlightedWords: Set<number>;
  /** Timestamp when the current verse became fully visible. */
  lastChangeTs: number;
}

type SoakAction =
  | { type: "NAVIGATE"; newIndex: number }
  | { type: "PHASE_COMPLETE" }
  | { type: "TOGGLE_WORD"; key: number };

function soakReducer(state: SoakState, action: SoakAction): SoakState {
  switch (action.type) {
    case "NAVIGATE": {
      if (state.phase !== "idle") return state;
      const inactive = state.activeSlot === "a" ? "b" : "a";
      return {
        ...state,
        currentIndex: action.newIndex,
        ...(inactive === "a"
          ? { slotA: action.newIndex }
          : { slotB: action.newIndex }),
        phase: "preparing",
        highlightedWords: new Set(),
      };
    }

    case "PHASE_COMPLETE": {
      if (state.phase === "preparing") {
        return { ...state, phase: "crossfading" };
      }
      if (state.phase === "crossfading") {
        return {
          ...state,
          activeSlot: state.activeSlot === "a" ? "b" : "a",
          phase: "idle",
          lastChangeTs: Date.now(),
        };
      }
      return state;
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
  const lastTouchTs = useRef(0);

  /* ── Exit icon visibility ────────────────────────────────────────── */
  const [exitVisible, setExitVisible] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── One-time mount fade-in ──────────────────────────────────────── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Schedule on next animation frame so the browser paints opacity 0 first,
    // then we flip to 1 and the CSS transition produces a smooth fade-in.
    requestAnimationFrame(() => setMounted(true));
  }, []);

  /* ── Reducer ─────────────────────────────────────────────────────── */
  const [state, dispatch] = useReducer(soakReducer, {
    currentIndex: 0,
    activeSlot: "a" as const,
    slotA: 0,
    slotB: 0,
    phase: "idle" as Phase,
    highlightedWords: new Set<number>(),
    lastChangeTs: Date.now(),
  });

  /* ── Phase transition effects ────────────────────────────────────── */
  useEffect(() => {
    if (state.phase === "idle") return;

    if (state.phase === "preparing") {
      // The inactive slot just got new content at opacity 0.
      // Wait for the browser to paint it, then start the crossfade.
      let cancelled = false;
      requestAnimationFrame(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          dispatch({ type: "PHASE_COMPLETE" });
        });
      });
      return () => {
        cancelled = true;
      };
    }

    // crossfading → wait for the CSS transition to finish, then complete
    const timer = setTimeout(
      () => dispatch({ type: "PHASE_COMPLETE" }),
      CROSSFADE_MS,
    );
    return () => clearTimeout(timer);
  }, [state.phase]);

  /* ── Navigation handler ──────────────────────────────────────────── */
  const handleNav = useCallback(
    (direction: 1 | -1) => {
      if (state.phase !== "idle") return;
      if (Date.now() - state.lastChangeTs < COOLDOWN_MS) return;

      const newIndex = state.currentIndex + direction;
      if (newIndex < 0 || newIndex >= section.verses.length) return;

      dispatch({ type: "NAVIGATE", newIndex });
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

      touchStartX.current = null;
      touchStartY.current = null;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      handleNav(deltaX < 0 ? 1 : -1);
    },
    [handleNav],
  );

  /* ── Click-zone handler (desktop mouse only) ───────────────────── */
  const handleZoneClick = useCallback(
    (direction: 1 | -1) => {
      if (Date.now() - lastTouchTs.current < 800) return;
      handleNav(direction);
    },
    [handleNav],
  );

  /* ── Exit icon ─────────────────────────────────────────────────── */
  const showExitIcon = useCallback(() => {
    setExitVisible(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(
      () => setExitVisible(false),
      EXIT_VISIBLE_MS,
    );
  }, []);

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

  /* ── Slot opacities ────────────────────────────────────────────── */
  const isXfading = state.phase === "crossfading";

  // idle / preparing: active slot visible (1), inactive hidden (0)
  // crossfading:      active (outgoing) → 0,  inactive (incoming) → 1
  const slotAOpacity =
    state.activeSlot === "a"
      ? isXfading
        ? 0
        : mounted
          ? 1
          : 0
      : isXfading
        ? 1
        : 0;

  const slotBOpacity =
    state.activeSlot === "b"
      ? isXfading
        ? 0
        : mounted
          ? 1
          : 0
      : isXfading
        ? 1
        : 0;

  // The "target" slot is whichever holds the latest verse:
  //   idle → activeSlot;  preparing/crossfading → the incoming slot
  const targetSlot =
    state.phase === "idle"
      ? state.activeSlot
      : state.activeSlot === "a"
        ? "b"
        : "a";

  /* ── Verse data ────────────────────────────────────────────────── */
  const verseA = section.verses[state.slotA];
  const verseB = section.verses[state.slotB];
  const tokensA = verseA ? tokenizeVerse(verseA.text) : [];
  const tokensB = verseB ? tokenizeVerse(verseB.text) : [];

  const verseIndicator = `${state.currentIndex + 1} / ${section.verses.length}`;

  /* ── Render a verse slot ───────────────────────────────────────── */
  const renderSlot = (
    tokens: ReturnType<typeof tokenizeVerse>,
    opacity: number,
    slotKey: string,
    isTarget: boolean,
  ) => (
    <div
      key={slotKey}
      className="absolute inset-0 flex items-center justify-center px-8"
      style={{
        pointerEvents:
          isTarget && state.phase === "idle" ? "auto" : "none",
      }}
    >
      <p
        className="soak-verse soak-text max-w-lg"
        style={{ opacity }}
        data-testid={isTarget ? "soak-verse" : undefined}
        aria-live={isTarget ? "polite" : "off"}
      >
        {tokens.map((token) => (
          <span
            key={token.key}
            onClick={
              isTarget
                ? (e) => handleWordClick(token.key, e)
                : undefined
            }
            className={`soak-word ${
              isTarget && state.highlightedWords.has(token.key)
                ? "soak-word-highlighted"
                : ""
            }`}
            data-testid={
              isTarget ? `soak-word-${token.key}` : undefined
            }
            role="button"
            tabIndex={-1}
          >
            {token.text}{" "}
          </span>
        ))}
      </p>
    </div>
  );

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div
      ref={bgRef}
      data-testid="soak-breathe"
      className="soak-breathe"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Click zones — left/right for desktop, center for exit reveal */}
      <div
        className="fixed inset-0 z-[51] flex"
        data-testid="soak-click-zones"
      >
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

      {/* Verse text — two overlapping slots, crossfaded.
          No DOM swap ever happens during a visible transition. */}
      <div
        className={`fixed inset-0 z-[52] pointer-events-none soak-breathe-text ${fontClassName}`}
      >
        {renderSlot(tokensA, slotAOpacity, "a", targetSlot === "a")}
        {renderSlot(tokensB, slotBOpacity, "b", targetSlot === "b")}
      </div>

      {/* Verse indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-[53] flex justify-center pt-safe"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <span
          className="text-[11px] tracking-[0.2em] uppercase font-light"
          style={{ color: "rgba(255, 252, 240, 0.3)" }}
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
          if (!exitVisible) showExitIcon();
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
            transition:
              "opacity 500ms ease, background-color 500ms ease, transform 300ms ease",
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
