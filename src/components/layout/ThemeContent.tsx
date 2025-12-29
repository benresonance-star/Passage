"use client";

import { useBCM } from "@/context/BCMContext";
import { BottomNav } from "@/components/BottomNav";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

// Helper to calculate brightness of a hex color
function getBrightness(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function ThemeContent({ children }: { children: React.ReactNode }) {
  const { state, isHydrated } = useBCM();
  
  const theme = isHydrated && state.settings.theme 
    ? state.settings.theme 
    : { bg: "#000000", text: "#f4f4f5" };

  const isLight = getBrightness(theme.bg) > 128;

  return (
    <body
      className={`${inter.className} antialiased selection:bg-orange-500/30 transition-colors duration-500 ${isLight ? "theme-light" : "theme-dark"}`}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        minHeight: "100vh",
      }}
    >
      <style jsx global>{`
        :root {
          --theme-bg: ${theme.bg};
          --theme-text: ${theme.text};
          --theme-ui-bg: ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'};
          --theme-ui-border: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'};
          --theme-ui-subtext: ${isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'};
        }
      `}</style>
      <main className="min-h-screen pb-24 max-w-md mx-auto px-4 pt-safe">
        {children}
      </main>
      <BottomNav />
    </body>
  );
}
