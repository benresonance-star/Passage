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
    return () => clearTimeout(holdTimer);
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
      className="soak-breathe"
      style={{
        zIndex: 9999,
        transition: `opacity ${FADE_OUT_MS}ms ease-in-out`,
        opacity,
      }}
      aria-hidden={phase === "done"}
    >
      {/* Centered title */}
      <div
        className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center ${splashFont.className}`}
        style={{
          transition: `opacity ${FADE_OUT_MS}ms ease-in-out`,
          opacity,
        }}
      >
        <h1
          className="text-[42px] tracking-[0.08em] font-light"
          style={{
            color: "rgba(255, 252, 240, 0.92)",
            textShadow:
              "0 0 30px rgba(255, 210, 150, 0.25), 0 0 60px rgba(255, 195, 120, 0.1)",
            animation: "splash-title-in 1.8s ease-out both",
          }}
        >
          Passage
        </h1>

        {/* Subtle tagline that fades in after the title */}
        <p
          className="mt-3 text-[13px] tracking-[0.25em] uppercase font-light"
          style={{
            color: "rgba(255, 252, 240, 0.92)",
            animation: "splash-subtitle-in 2s ease-out 0.6s both",
          }}
        >
          Dwell in the Word
        </p>
      </div>

      {/* Inline keyframes for the title entrance — scoped to splash lifetime */}
      <style>{`
        @keyframes splash-title-in {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
            letter-spacing: 0.14em;
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            letter-spacing: 0.08em;
          }
        }
        @keyframes splash-subtitle-in {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
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

