"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useBCM } from "@/context/BCMContext";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen, wasSplashShown } from "@/components/SplashScreen";
import { MeditationScreen } from "@/components/MeditationScreen";
import { useScrollAwareBottomNav } from "@/hooks/useScrollAwareBottomNav";
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
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // Splash: shown once per browser session
  // Initialize synchronously to avoid initial flash
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== "undefined") {
      return !wasSplashShown();
    }
    return false;
  });
  const [showMeditation, setShowMeditation] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset navigation guard when pathname changes (route change complete)
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setShowMeditation(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pathname, isNavigating]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);


  const theme = isHydrated && state.settings.theme
    ? state.settings.theme
    : { bg: "#000000", text: "#f4f4f5" };

  const isDawn = theme.id === "dawn";
  const isLight = !isDawn && getBrightness(theme.bg) > 128;
  const isSoaking = pathname === "/soak";

  const { isCollapsed, setCollapsed, resetCollapseTimer } = useScrollAwareBottomNav();

  // Apply dynamic theme to <body> and CSS custom properties to :root
  useLayoutEffect(() => {
    const body = document.body;
    const root = document.documentElement;

    // Set data-theme for CSS selector targeting
    if (theme.id) {
      root.setAttribute("data-theme", theme.id);
    } else {
      root.removeAttribute("data-theme");
    }

    // Dawn data-attribute for CSS-only rules (e.g. glass blur)
    if (isDawn) {
      root.setAttribute("data-dawn", "");
    } else {
      root.removeAttribute("data-dawn");
    }

    if (isDawn) {
      // Dawn: transparent body so the gradient div shows through
      body.style.backgroundColor = "transparent";
      root.style.backgroundColor = "#3d3566"; // Match Dawn's primary dark color
      body.style.color = theme.text;

      body.classList.remove("theme-light", "theme-dark");
      body.classList.add("theme-dark");

      root.style.setProperty("--theme-bg", "transparent");
      root.style.setProperty("--theme-text", theme.text);
      root.style.setProperty("--theme-ui-bg", "rgba(255,255,255,0.08)");
      root.style.setProperty("--theme-ui-border", "rgba(255,255,255,0.12)");
      root.style.setProperty("--theme-ui-subtext", "rgba(255,252,240,0.5)");
      root.style.setProperty("--muted", "rgba(255,255,255,0.6)");
      root.style.setProperty("--muted-strong", "rgba(255,255,255,0.4)");
      root.style.setProperty("--label", "rgba(255,255,255,0.6)");

      // Surface tokens — translucent glass for Dawn (raised opacity for clarity)
      root.style.setProperty("--surface", "rgba(255,255,255,0.12)");
      root.style.setProperty("--surface-alt", "rgba(255,255,255,0.20)");
      root.style.setProperty("--surface-border", "rgba(255,255,255,0.30)");
      root.style.setProperty("--overlay", "rgba(0,0,0,0.60)");
      root.style.setProperty("--overlay-surface", "rgba(0,0,0,0.65)");
      root.style.setProperty("--input-bg", "rgba(0,0,0,0.30)");

      // Flow mode — soft warm glow instead of orange
      root.style.setProperty("--flow-read", "rgba(255,252,240,1)");
      root.style.setProperty("--flow-unread", "rgba(255,252,240,0.22)");
      root.style.setProperty("--flow-glow", "0 0 18px rgba(255,210,150,0.25)");

      // Chunk highlight colors — readable against the Dawn gradient
      root.style.setProperty("--chunk-active", "rgba(255,252,240,0.95)");
      root.style.setProperty("--chunk-memorised", "#FFCB1F");       // golden yellow
      root.style.setProperty("--chunk-memorised-sub", "rgba(255,203,31,0.6)");
    } else {
      body.style.backgroundColor = theme.bg;
      root.style.backgroundColor = theme.bg; // Force HTML tag to match theme
      body.style.color = theme.text;

      body.classList.remove("theme-light", "theme-dark");
      body.classList.add(isLight ? "theme-light" : "theme-dark");

      root.style.setProperty("--theme-bg", theme.bg);
      root.style.setProperty("--theme-text", theme.text);
      root.style.setProperty("--theme-ui-bg", isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)");
      root.style.setProperty("--theme-ui-border", isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)");
      root.style.setProperty("--theme-ui-subtext", isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)");
      root.style.setProperty("--muted", isLight ? "#71717a" : "#71717a");
      root.style.setProperty("--muted-strong", isLight ? "#52525b" : "#52525b");
      root.style.setProperty("--label", isLight ? "#a1a1aa" : "#a1a1aa");

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

      // Flow mode — standard colours for non-Dawn themes
      root.style.setProperty("--flow-read", "#f97316");       // orange-500
      root.style.setProperty("--flow-unread", isLight ? "rgba(0,0,0,0.15)" : "#27272a");
      root.style.setProperty("--flow-glow", "none");

      // Chunk highlight colors — standard orange/amber
      root.style.setProperty("--chunk-active", "#f97316");       // orange-500
      root.style.setProperty("--chunk-memorised", "rgba(245,158,11,0.8)"); // amber-500/80
      root.style.setProperty("--chunk-memorised-sub", "rgba(245,158,11,0.5)"); // amber-500/50
    }
  }, [theme, isLight, isDawn]);

  return (
    <>
      {/* Dawn breathing gradient — persistent, isolated layer (hidden in Soaking mode to avoid double-draw) */}
      {isDawn && !isSoaking && <div className="dawn-bg" />}

      {/* Persistent background for Splash and Meditation continuity */}
      {(showSplash || showMeditation) && <div className="soak-breathe fixed inset-0 z-[9997]" />}

      {showSplash && (
        <SplashScreen
          onFadeStart={() => setShowMeditation(true)}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {showMeditation && (
        <MeditationScreen 
          onComplete={() => {
            if (pathname === "/") {
              setIsNavigating(true);
              router.push("/chapter");
            } else {
              setShowMeditation(false);
            }
          }} 
        />
      )}
      <main 
        className={`relative z-[1] min-h-screen pt-safe max-w-2xl mx-auto px-6 md:px-12 transition-all duration-700 ${isDawn ? dawnFont.className : ""} ${(showSplash || showMeditation || isNavigating) ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{ 
          paddingBottom: isSoaking ? '0' : `calc(${isCollapsed ? '3rem' : '4rem'} + 1rem + env(safe-area-inset-bottom))`
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {!isSoaking && !showSplash && !showMeditation && !isNavigating && (
        <BottomNav 
          isDawn={isDawn} 
          isCollapsed={isCollapsed} 
          onExpand={() => {
            setCollapsed(false);
            resetCollapseTimer();
          }} 
        />
      )}
    </>
  );
}
