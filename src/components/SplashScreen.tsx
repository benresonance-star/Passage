"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Cormorant_Garamond } from "next/font/google";
import "@/modules/soak/breathe.css";

const splashFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
});

/* ─── Timing ──────────────────────────────────────────────────────── */

const HOLD_MS = 5000;      // Time the splash stays fully visible
const FADE_OUT_MS = 900;   // Fade-out duration

const SESSION_KEY = "passage-splash-shown";

/* ─── Component ──────────────────────────────────────────────────── */

interface SplashScreenProps {
  /** Called when the fade-out BEGINS — navigate here while splash still covers screen. */
  onFadeStart?: () => void;
  /** Called once the splash has fully faded out — safe to unmount. */
  onComplete: () => void;
}

export function SplashScreen({ onFadeStart, onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"hold" | "fade-out" | "done">("hold");
  const [startSubtitle, setStartSubtitle] = useState(false);
  const fadeStartFired = useRef(false);

  // After HOLD_MS, begin fade-out
  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("fade-out"), HOLD_MS);
    const subtitleTimer = setTimeout(() => setStartSubtitle(true), 1500);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(subtitleTimer);
    };
  }, []);

  // Fire onFadeStart exactly once when fade-out begins
  useEffect(() => {
    if (phase === "fade-out" && !fadeStartFired.current) {
      fadeStartFired.current = true;
      onFadeStart?.();
    }
  }, [phase, onFadeStart]);

  // After fade-out completes, mark done
  useEffect(() => {
    if (phase !== "fade-out") return;
    const fadeTimer = setTimeout(() => setPhase("done"), FADE_OUT_MS);
    return () => clearTimeout(fadeTimer);
  }, [phase]);

  // When done, persist flag and notify parent
  const handleComplete = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable (SSR, private mode edge case) — safe to ignore
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (phase === "done") handleComplete();
  }, [phase, handleComplete]);

  const opacity = phase === "hold" ? 1 : phase === "fade-out" ? 0 : 0;

  return (
    <div
      className="soak-breathe fixed w-full h-full"
      style={{
        zIndex: 9999,
        transition: `opacity ${FADE_OUT_MS}ms ease-in-out`,
        opacity,
      }}
      aria-hidden={phase === "done"}
    >
      {/* Centered title */}
      <div
        className={`fixed inset-0 z-[10000] flex items-center justify-center pb-safe ${splashFont.className}`}
      >
        <div className="text-center">
          <h1
            className="splash-title text-[42px] tracking-[0.08em] font-light"
            style={{
              color: "rgba(255, 252, 240, 0.92)",
              textShadow:
                "0 0 30px rgba(255, 210, 150, 0.25), 0 0 60px rgba(255, 195, 120, 0.1)",
            }}
          >
            Passage
          </h1>

          {/* Subtle tagline that fades in after the title */}
          <p
            className={`splash-subtitle mt-3 text-[13px] tracking-[0.25em] uppercase font-light ${startSubtitle ? "is-animating" : ""}`}
            style={{
              color: "rgba(255, 252, 240, 0.92)",
              opacity: startSubtitle ? undefined : 0,
            }}
          >
            Dwell in the Word
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns true if the splash has already been shown this session.
 * Call this before rendering <SplashScreen> to avoid a flash.
 */
export function wasSplashShown(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

