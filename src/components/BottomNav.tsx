"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Play, Mic, Droplets, RefreshCw, Upload } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Chapter", href: "/chapter", icon: BookOpen },
  { label: "Practice", href: "/practice", icon: Play },
  { label: "Recite", href: "/recite", icon: Mic },
  { label: "Soak", href: "/soak", icon: Droplets },
  { label: "Review", href: "/review", icon: RefreshCw },
];

export function BottomNav({ isDawn = false }: { isDawn?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-[2] pb-safe pt-2 ${
      isDawn 
        ? "bg-black/30 backdrop-blur-md border-t border-white/10" 
        : "bg-zinc-900 border-t border-zinc-800"
    }`}>
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => {
                if (pathname === href) {
                  // If we are already on this page, dispatch a reset event
                  if (href === "/practice") {
                    window.dispatchEvent(new CustomEvent("bcm-reset-practice"));
                  }
                  if (href === "/recite") {
                    window.dispatchEvent(new CustomEvent("bcm-reset-recite"));
                  }
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive 
                  ? "text-orange-500" 
                  : isDawn ? "text-white/50" : "text-zinc-500"
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

