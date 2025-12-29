import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BCMProvider, useBCM } from "@/context/BCMContext";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { state } = useBCM();
  const theme = state.settings.theme || { bg: "#000000", text: "#f4f4f5" };

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <BCMProvider>
        <ThemeWrapper>{children}</ThemeWrapper>
      </BCMProvider>
    </html>
  );
}
