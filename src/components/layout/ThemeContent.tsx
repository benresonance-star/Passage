"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBCM } from "@/context/BCMContext";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen, wasSplashShown } from "@/components/SplashScreen";
import { Cormorant_Garamond } from "next/font/google";

const dawnFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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

  const isDawn = theme.id === "dawn";
  const isLight = !isDawn && getBrightness(theme.bg) > 128;

  // Apply dynamic theme to <body> and CSS custom properties to :root
  useLayoutEffect(() => {
    const body = document.body;
    const root = document.documentElement;

    // Dawn data-attribute for CSS-only rules (e.g. glass blur)
    if (isDawn) {
      root.setAttribute("data-dawn", "");
    } else {
      root.removeAttribute("data-dawn");
    }

    if (isDawn) {
      // Dawn: transparent body so the gradient div shows through
      body.style.backgroundColor = "transparent";
      body.style.color = theme.text;

      body.classList.remove("theme-light", "theme-dark");
      body.classList.add("theme-dark");

      root.style.setProperty("--theme-bg", "transparent");
      root.style.setProperty("--theme-text", theme.text);
      root.style.setProperty("--theme-ui-bg", "rgba(255,255,255,0.08)");
      root.style.setProperty("--theme-ui-border", "rgba(255,255,255,0.12)");
      root.style.setProperty("--theme-ui-subtext", "rgba(255,252,240,0.5)");

      // Surface tokens — translucent glass for Dawn
      root.style.setProperty("--surface", "rgba(0,0,0,0.22)");
      root.style.setProperty("--surface-alt", "rgba(255,255,255,0.08)");
      root.style.setProperty("--surface-border", "rgba(255,255,255,0.10)");
      root.style.setProperty("--overlay", "rgba(0,0,0,0.60)");
      root.style.setProperty("--overlay-surface", "rgba(0,0,0,0.65)");
      root.style.setProperty("--input-bg", "rgba(0,0,0,0.30)");
    } else {
      body.style.backgroundColor = theme.bg;
      body.style.color = theme.text;

      body.classList.remove("theme-light", "theme-dark");
      body.classList.add(isLight ? "theme-light" : "theme-dark");

      root.style.setProperty("--theme-bg", theme.bg);
      root.style.setProperty("--theme-text", theme.text);
      root.style.setProperty("--theme-ui-bg", isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)");
      root.style.setProperty("--theme-ui-border", isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)");
      root.style.setProperty("--theme-ui-subtext", isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)");

      // Surface tokens — opaque for standard themes
      if (isLight) {
        root.style.setProperty("--surface", "rgba(0,0,0,0.04)");
        root.style.setProperty("--surface-alt", "rgba(0,0,0,0.07)");
        root.style.setProperty("--surface-border", "rgba(0,0,0,0.10)");
        root.style.setProperty("--overlay", "rgba(0,0,0,0.50)");
        root.style.setProperty("--overlay-surface", theme.bg);
        root.style.setProperty("--input-bg", "rgba(0,0,0,0.04)");
      } else {
        root.style.setProperty("--surface", "#18181b");
        root.style.setProperty("--surface-alt", "#27272a");
        root.style.setProperty("--surface-border", "#27272a");
        root.style.setProperty("--overlay", "rgba(0,0,0,0.90)");
        root.style.setProperty("--overlay-surface", "#18181b");
        root.style.setProperty("--input-bg", "#000000");
      }
    }
  }, [theme, isLight, isDawn]);

  return (
    <>
      {/* Dawn breathing gradient — persistent, behind everything */}
      {isDawn && <div className="dawn-bg" />}

      {showSplash && (
        <SplashScreen
          onFadeStart={() => router.push("/chapter")}
          onComplete={() => setShowSplash(false)}
        />
      )}
      <main className={`relative z-[1] min-h-screen pb-24 max-w-md mx-auto px-4 pt-safe ${isDawn ? dawnFont.className : ""}`}>
        {children}
      </main>
      <BottomNav isDawn={isDawn} />
    </>
  );
}
