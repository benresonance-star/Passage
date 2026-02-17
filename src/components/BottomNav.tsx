"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Play, Mic, Droplets, RefreshCw } from "lucide-react";
import { useBCM } from "@/context/BCMContext";

const NAV_ITEMS = [
  { label: "Chapter", href: "/chapter", icon: BookOpen },
  { label: "Soak", href: "/soak", icon: Droplets },
  { label: "Practice", href: "/practice", icon: Play },
  { label: "Review", href: "/review", icon: RefreshCw },
];

export function BottomNav({ 
  isDawn = false,
  isCollapsed = false,
  onExpand
}: { 
  isDawn?: boolean;
  isCollapsed?: boolean;
  onExpand?: () => void;
}) {
  const pathname = usePathname();
  const { state } = useBCM();
  const hasChapter = !!state.selectedChapterId;
  const isSepia = state.settings.theme?.bg === "#fdf6e3";

  return (
    <nav 
      onClick={() => isCollapsed && onExpand?.()}
      data-state={isCollapsed ? "collapsed" : "expanded"}
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-[2] transition-all duration-500 ease-in-out mb-4 rounded-full shadow-lg border border-white/10 will-change-[transform,width,height,opacity] ${
        isCollapsed 
          ? "h-10 w-24" 
          : "h-16 w-[calc(100%-2rem)] max-w-md"
      } ${
        isDawn 
          ? "bg-black/30 backdrop-blur-md border-white/10" 
          : isSepia
            ? "bg-white border-zinc-200"
            : "bg-[var(--surface)] border-[var(--surface-border)]"
      }`}
    >
      <div className="relative w-full h-full overflow-hidden rounded-full">
        {/* Minimized State Content (Pill with Book Icon) */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
            isCollapsed ? "opacity-100" : "opacity-0"
          }`}
        >
          <BookOpen size={20} className="text-white" />
        </div>

        {/* Expanded State Content (Full Navigation Grid) */}
        <div 
          className={`absolute inset-0 flex items-center justify-around px-4 transition-all duration-500 ${
            isCollapsed ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
          }`}
        >
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
                  if (isCollapsed) {
                    e.preventDefault();
                    onExpand?.();
                    return;
                  }
                  if (pathname === href) {
                    if (href === "/practice") {
                      window.dispatchEvent(new CustomEvent("bcm-reset-practice"));
                    }
                    if (href === "/recite") {
                      window.dispatchEvent(new CustomEvent("bcm-reset-recite"));
                    }
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-colors duration-300 ${
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
      </div>
    </nav>
  );
}
