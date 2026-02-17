"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface ScrollOptions {
  threshold?: number;
  topOffset?: number;
  expandOnRouteChange?: boolean;
  autoCollapseDelay?: number;
}

export function useScrollAwareBottomNav(options: ScrollOptions = {}) {
  const { 
    threshold = 15, 
    topOffset = 24, 
    expandOnRouteChange = true,
    autoCollapseDelay = 3000 // 3 seconds of inactivity
  } = options;

  const [isCollapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setCollapsed(true);
    }, autoCollapseDelay);
  };

  useEffect(() => {
    let rafId: number;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      // Don't collapse if we're near the top
      if (currentScrollY < topOffset) {
        if (isCollapsed) setCollapsed(false);
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      } 
      // Directional scroll detection with threshold
      else if (Math.abs(delta) > threshold) {
        if (delta > 0 && !isCollapsed) {
          // Scrolling down - collapse immediately
          setCollapsed(true);
        } else if (delta < 0 && isCollapsed) {
          // Scrolling up - expand and start timer
          setCollapsed(false);
          resetCollapseTimer();
        }
      }

      lastScrollY.current = currentScrollY;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => setCollapsed(false), { passive: true });

    // Initial timer if not at top
    if (window.scrollY >= topOffset) {
      resetCollapseTimer();
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", () => setCollapsed(false));
      cancelAnimationFrame(rafId);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [isCollapsed, threshold, topOffset]);

  // Expand on route change and start timer
  useEffect(() => {
    if (expandOnRouteChange) {
      setCollapsed(false);
      if (window.scrollY >= topOffset) {
        resetCollapseTimer();
      }
    }
  }, [pathname, expandOnRouteChange]);

  return { isCollapsed, setCollapsed, resetCollapseTimer };
}
