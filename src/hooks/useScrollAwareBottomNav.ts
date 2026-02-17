"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface ScrollOptions {
  threshold?: number;
  topOffset?: number;
  expandOnRouteChange?: boolean;
}

export function useScrollAwareBottomNav(options: ScrollOptions = {}) {
  const { 
    threshold = 15, 
    topOffset = 24, 
    expandOnRouteChange = true 
  } = options;

  const [isCollapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    let rafId: number;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      // Don't collapse if we're near the top
      if (currentScrollY < topOffset) {
        if (isCollapsed) setCollapsed(false);
      } 
      // Directional scroll detection with threshold
      else if (Math.abs(delta) > threshold) {
        if (delta > 0 && !isCollapsed) {
          // Scrolling down
          setCollapsed(true);
        } else if (delta < 0 && isCollapsed) {
          // Scrolling up
          setCollapsed(false);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    
    // Also handle potential orientation changes or resize
    window.addEventListener("resize", () => setCollapsed(false), { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", () => setCollapsed(false));
      cancelAnimationFrame(rafId);
    };
  }, [isCollapsed, threshold, topOffset]);

  // Expand on route change
  useEffect(() => {
    if (expandOnRouteChange) {
      setCollapsed(false);
    }
  }, [pathname, expandOnRouteChange]);

  return { isCollapsed, setCollapsed };
}
