"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface NavOptions {
  expandOnRouteChange?: boolean;
  autoCollapseDelay?: number;
}

/**
 * Hook to manage the bottom navigation state (collapsed vs expanded).
 * Now purely interaction-based: Tap to expand, auto-collapse after a delay.
 */
export function useScrollAwareBottomNav(options: NavOptions = {}) {
  const { 
    expandOnRouteChange = true,
    autoCollapseDelay = 3000 // 3 seconds of inactivity
  } = options;

  // Start collapsed by default
  const [isCollapsed, setCollapsed] = useState(true);
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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  // Expand on route change and start timer
  useEffect(() => {
    if (expandOnRouteChange) {
      setCollapsed(false);
      // Stagger the auto-collapse to allow page entry animations to finish
      const timer = setTimeout(() => {
        setCollapsed(true);
      }, 2500); // 2.5s delay gives breathing room for splash/entry animations
      return () => clearTimeout(timer);
    }
  }, [pathname, expandOnRouteChange]);

  return { isCollapsed, setCollapsed, resetCollapseTimer };
}
