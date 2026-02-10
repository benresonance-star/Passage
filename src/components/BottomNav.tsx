"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Play, Mic, Droplets, RefreshCw } from "lucide-react";
import { useBCM } from "@/context/BCMContext";

const NAV_ITEMS = [
  { label: "Chapter", href: "/chapter", icon: BookOpen },
  { label: "Soak", href: "/soak", icon: Droplets },
  { label: "Practice", href: "/practice", icon: Play },
  { label: "Recite", href: "/recite", icon: Mic },
  { label: "Review", href: "/review", icon: RefreshCw },
];

export function BottomNav({ isDawn = false }: { isDawn?: boolean }) {
  const pathname = usePathname();
  const { state } = useBCM();
  const hasChapter = !!state.selectedChapterId;

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-[2] pb-safe pt-2 transition-all duration-300 ${
      isDawn 
        ? "bg-black/30 backdrop-blur-md border-t border-white/10" 
        : "bg-[var(--surface)] border-t border-[var(--surface-border)]"
    }`}>
      <div className="grid grid-cols-5 h-16 px-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          const isPracticeItem = href !== "/chapter" && href !== "/";
          const isDisabled = isPracticeItem && !hasChapter;

          if (isDisabled) {
            return (
              <div
                key={href}
                className="flex flex-col items-center justify-center gap-1 opacity-20 cursor-not-allowed pointer-events-none"
              >
                <Icon size={24} className="text-zinc-500" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {label}
                </span>
              </div>
            );
          }

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

