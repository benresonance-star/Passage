"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Play, Mic, Droplets, RefreshCw } from "lucide-react";

const NAV_ITEMS = [
  { label: "Chapter", href: "/chapter", icon: BookOpen },
  { label: "Soak", href: "/soak", icon: Droplets },
  { label: "Practice", href: "/practice", icon: Play },
  { label: "Recite", href: "/recite", icon: Mic },
  { label: "Review", href: "/review", icon: RefreshCw },
];

export function BottomNav({ isDawn = false }: { isDawn?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-[2] pb-safe pt-2 ${
      isDawn 
        ? "bg-black/30 backdrop-blur-md border-t border-white/10" 
        : "bg-[var(--surface)] border-t border-[var(--surface-border)]"
    }`}>
      <div className="flex items-center h-16 max-w-md mx-auto px-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => {
                if (pathname === href) {
                  if (href === "/practice") {
                    window.dispatchEvent(new CustomEvent("bcm-reset-practice"));
                  }
                  if (href === "/recite") {
                    window.dispatchEvent(new CustomEvent("bcm-reset-recite"));
                  }
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
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

