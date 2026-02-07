"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBCM } from "@/context/BCMContext";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen, wasSplashShown } from "@/components/SplashScreen";

// Helper to calculate brightness of a hex color
function getBrightness(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function ThemeContent({ children }: { children: React.ReactNode }) {
  const { state, isHydrated } = useBCM();
  const router = useRouter();

  // Splash: shown once per browser session
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Only check sessionStorage after hydration (client-side)
    if (isHydrated && !wasSplashShown()) {
      setShowSplash(true);
    }
  }, [isHydrated]);

  const theme = isHydrated && state.settings.theme
    ? state.settings.theme
    : { bg: "#000000", text: "#f4f4f5" };

  const isLight = getBrightness(theme.bg) > 128;

  // Apply dynamic theme to <body> and CSS custom properties to :root
  useLayoutEffect(() => {
    const body = document.body;
    body.style.backgroundColor = theme.bg;
    body.style.color = theme.text;

    body.classList.remove("theme-light", "theme-dark");
    body.classList.add(isLight ? "theme-light" : "theme-dark");

    const root = document.documentElement;
    root.style.setProperty("--theme-bg", theme.bg);
    root.style.setProperty("--theme-text", theme.text);
    root.style.setProperty("--theme-ui-bg", isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)");
    root.style.setProperty("--theme-ui-border", isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)");
    root.style.setProperty("--theme-ui-subtext", isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)");
  }, [theme, isLight]);

  return (
    <>
      {showSplash && (
        <SplashScreen
          onFadeStart={() => router.push("/chapter")}
          onComplete={() => setShowSplash(false)}
        />
      )}
      <main className="min-h-screen pb-24 max-w-md mx-auto px-4 pt-safe">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
