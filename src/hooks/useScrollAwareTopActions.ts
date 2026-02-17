"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface TopActionOptions {
  autoCollapseDelay?: number;
}

/**
 * Hook to manage the top actions state (collapsed vs expanded).
 * Anchored to the Settings icon on the right.
 */
export function useScrollAwareTopActions(options: TopActionOptions = {}) {
  const { 
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

  // Collapse immediately on route change
  useEffect(() => {
    setCollapsed(true);
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
  }, [pathname]);

  return { isCollapsed, setCollapsed, resetCollapseTimer };
}
