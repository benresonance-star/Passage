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
      // Immediately collapse after a very short delay to allow the user to see the change
      // or just collapse immediately if that's the desired behavior.
      // The user said "minimises immediately again" upon changing section.
      const timer = setTimeout(() => {
        setCollapsed(true);
      }, 500); // Small delay so it's not a jarring jump, but feels "immediate"
      return () => clearTimeout(timer);
    }
  }, [pathname, expandOnRouteChange]);

  return { isCollapsed, setCollapsed, resetCollapseTimer };
}
