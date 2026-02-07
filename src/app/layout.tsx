import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BCMProvider } from "@/context/BCMContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeContent } from "@/components/layout/ThemeContent";
import { Inter } from "next/font/google";

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
        className={`${inter.className} antialiased selection:bg-orange-500/30 transition-colors duration-500 theme-dark`}
        style={{ backgroundColor: "#000000", color: "#f4f4f5", minHeight: "100vh" }}
      >
        <AuthProvider>
          <BCMProvider>
            <ThemeContent>{children}</ThemeContent>
          </BCMProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
