"use client";

import { motion } from "framer-motion";
import "@/modules/soak/breathe.css";

interface SoakIntroProps {
  fontClassName?: string;
}

export function SoakIntro({ fontClassName = "" }: SoakIntroProps) {
  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden ${fontClassName}`}>
      {/* Background layer */}
      <div className="soak-breathe absolute inset-0" style={{ zIndex: -1 }} />
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 text-center px-10 max-w-xl"
      >
        <blockquote className="text-[26px] md:text-[32px] leading-[1.6] font-light text-[rgba(255,252,240,0.92)] italic">
          Be still and know that I am God
          <cite className="block mt-4 text-[13px] tracking-[0.25em] uppercase font-light text-[rgba(255,252,240,0.6)] not-italic">
            Psalm 46:10 (ESV)
          </cite>
          <div className="mt-8 text-[14px] tracking-[0.1em] text-[rgba(255,252,240,0.7)] not-italic font-normal">
            Let the Holy Spirit guide you...
          </div>
        </blockquote>
      </motion.div>
    </div>
  );
}
