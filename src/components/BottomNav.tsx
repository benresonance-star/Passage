"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Play, Mic, Droplets, RefreshCw, Smile } from "lucide-react";
import { useBCM } from "@/context/BCMContext";

const BlissfulFace = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 11c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5" />
    <path d="M13 11c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5" />
    <path d="M8 15c1.5 2 4.5 2 8 0" />
  </svg>
);

const NAV_ITEMS = [
  { label: "Chapter", href: "/chapter", icon: BookOpen },
  { label: "Soak", href: "/soak", icon: BlissfulFace },
  { label: "Practice", href: "/practice", icon: Play },
  { label: "Review", href: "/review", icon: RefreshCw },
];

export function BottomNav({ isDawn = false }: { isDawn?: boolean }) {
  const pathname = usePathname();
  const { state } = useBCM();
  const hasChapter = !!state.selectedChapterId;
  const isSepia = state.settings.theme?.bg === "#fdf6e3";

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-[2] transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${
      isDawn 
        ? "bg-black/30 backdrop-blur-md border-t border-white/10" 
        : isSepia
          ? "bg-white border-t border-zinc-200"
          : "bg-[var(--surface)] border-t border-[var(--surface-border)]"
    }`}>
      <div className="grid grid-cols-4 h-16 px-2">
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

