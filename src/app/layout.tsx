import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BCMProvider } from "@/context/BCMContext";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Passage - Bible Chapter Memoriser",
  description: "A minimal PWA for memorising Bible chapters.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Passage",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-black text-zinc-100 antialiased selection:bg-orange-500/30`}
      >
        <BCMProvider>
          <main className="min-h-screen pb-24 max-w-md mx-auto px-4 pt-safe">
            {children}
          </main>
          <BottomNav />
        </BCMProvider>
      </body>
    </html>
  );
}
