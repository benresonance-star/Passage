"use client";

import { useBCM } from "@/context/BCMContext";
import { BottomNav } from "@/components/BottomNav";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export function ThemeContent({ children }: { children: React.ReactNode }) {
  const { state, isHydrated } = useBCM();
  
  // Use a default theme during SSR and before hydration
  const theme = isHydrated && state.settings.theme 
    ? state.settings.theme 
    : { bg: "#000000", text: "#f4f4f5" };

  return (
    <body
      className={`${inter.className} antialiased selection:bg-orange-500/30 transition-colors duration-500`}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        minHeight: "100vh",
      }}
    >
      <main className="min-h-screen pb-24 max-w-md mx-auto px-4 pt-safe">
        {children}
      </main>
      <BottomNav />
    </body>
  );
}

