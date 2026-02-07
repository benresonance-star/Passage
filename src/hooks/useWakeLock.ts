"use client";

import { useEffect, useRef } from "react";

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    async function requestWakeLock() {
      if (!("wakeLock" in navigator)) return;
      
      try {
        // If we already have a lock, don't request another one
        if (wakeLockRef.current) return;
        
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        
        // Handle the lock being released by the system
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch {
        // NotAllowedError is common if the page isn't active or no user gesture
        // We catch it silently to avoid the dev overlay
      }
    }

    // Attempt on mount
    requestWakeLock();

    // Re-request when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
}
