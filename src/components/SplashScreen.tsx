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
  const fadeStartFired = useRef(false);

  // After HOLD_MS, begin fade-out
  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("fade-out"), HOLD_MS);
    return () => {
      clearTimeout(holdTimer);
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center pb-safe ${splashFont.className}`}
      style={{
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        opacity,
        pointerEvents: phase === "done" ? "none" : "auto",
        transform: "translate3d(0,0,0)",
        WebkitTransform: "translate3d(0,0,0)",
        willChange: "opacity",
      }}
    >
      {/* Centered title */}
      <div className="text-center relative z-[10000]">
        <h1
          className="splash-title text-[42px] tracking-[0.08em] font-light"
          style={{
            color: "rgba(255, 252, 240, 0.92)",
            textShadow: "0 0 30px rgba(255, 210, 150, 0.25), 0 0 60px rgba(255, 195, 120, 0.1)",
            animation: "splash-title-fade 2000ms ease-out forwards",
            WebkitAnimation: "splash-title-fade 2000ms ease-out forwards",
          }}
        >
          Passage
        </h1>

        {/* Subtle tagline that fades in after the title */}
        <p
          className="splash-subtitle mt-3 text-[13px] tracking-[0.25em] uppercase font-light"
          style={{
            color: "rgba(255, 252, 240, 0.92)",
            opacity: 0,
            animation: "splash-subtitle-fade 2000ms ease-out 1500ms forwards",
            WebkitAnimation: "splash-subtitle-fade 2000ms ease-out 1500ms forwards",
          }}
        >
          Dwell in the Word
        </p>
      </div>

      <style jsx global>{`
        @keyframes splash-title-fade {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes splash-subtitle-fade {
          from { opacity: 0; transform: translate3d(0, 5px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
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
