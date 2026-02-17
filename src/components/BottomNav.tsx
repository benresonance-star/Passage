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
      className={`fixed bottom-0 left-0 right-0 z-[2] transition-all duration-500 ease-in-out pb-[env(safe-area-inset-bottom)] ${
        isCollapsed 
          ? "h-12 mx-4 mb-4 rounded-full shadow-lg border border-white/10" 
          : "h-16 border-t"
      } ${
        isDawn 
          ? "bg-black/30 backdrop-blur-md border-white/10" 
          : isSepia
            ? "bg-white border-zinc-200"
            : "bg-[var(--surface)] border-[var(--surface-border)]"
      }`}
    >
      <div className={`grid grid-cols-4 h-full px-2 transition-all duration-500 ${isCollapsed ? "gap-4" : ""}`}>
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
                <Icon size={isCollapsed ? 20 : 24} className="text-zinc-500 transition-all duration-500" />
                {!isCollapsed && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    {label}
                  </span>
                )}
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
              className={`flex flex-col items-center justify-center transition-all duration-500 ${
                isActive 
                  ? "text-orange-500" 
                  : isDawn ? "text-white/50" : "text-zinc-500"
              } ${isCollapsed ? "gap-0" : "gap-1"}`}
            >
              <Icon size={isCollapsed ? 20 : 24} className="transition-all duration-500" />
              <span className={`text-[10px] font-medium uppercase tracking-wider transition-all duration-500 overflow-hidden ${
                isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100"
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

