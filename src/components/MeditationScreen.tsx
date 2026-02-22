"use client";

import { useState, useEffect } from "react";
import { Cormorant_Garamond } from "next/font/google";
import "@/modules/soak/breathe.css";

const meditationFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["italic", "normal"],
});

interface MeditationScreenProps {
  onComplete: () => void;
}

export function MeditationScreen({ onComplete }: MeditationScreenProps) {
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleTouch = () => {
    if (isFading) return;
    setIsFading(true);
    // Start navigation slightly before the fade-out is complete (at 1000ms of 1200ms)
    // to give the router time to prepare the next page while the screen is still black.
    setTimeout(onComplete, 1000);
  };

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center cursor-pointer ${meditationFont.className}`}
      style={{ 
        opacity: isFading ? 0 : isVisible ? 1 : 0,
        transition: "opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
        transform: "translate3d(0,0,0)",
        willChange: "opacity",
      }}
      onClick={handleTouch}
    >
      <div className="relative z-[9999] text-center px-10 max-w-xl"
           style={{
             animation: isVisible ? "meditation-fade-in 1200ms cubic-bezier(0.4, 0, 0.2, 1) forwards" : "none",
             opacity: 0,
             transform: "translate3d(0, 5px, 0)",
           }}>
        <blockquote className="text-[26px] md:text-[32px] leading-[1.6] font-light text-[rgba(255,252,240,0.92)] italic">
          "You keep him in perfect peace<br />
          <span className="pl-6 md:pl-8">whose mind is stayed on you,</span><br />
          <span className="pl-2 md:pl-4">because he trusts in you."</span>
        </blockquote>
        
        <cite className="block mt-10 text-[13px] tracking-[0.25em] uppercase font-light text-[rgba(255,252,240,0.6)] not-italic">
          Isaiah 26:3 (ESV)
        </cite>

        <p className="mt-16 text-[10px] tracking-[0.3em] uppercase font-light text-[rgba(255,252,240,0.3)] animate-pulse">
          Touch to continue
        </p>
      </div>
      <style jsx global>{`
        @keyframes meditation-fade-in {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </div>
  );
}
