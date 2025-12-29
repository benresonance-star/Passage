import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BCMProvider } from "@/context/BCMContext";
import { ThemeContent } from "@/components/layout/ThemeContent";

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
      <BCMProvider>
        <ThemeContent>{children}</ThemeContent>
      </BCMProvider>
    </html>
  );
}
