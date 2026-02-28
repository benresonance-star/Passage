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
          In the beginning was the Word,<br />
          and the Word was with God,<br />
          and the Word was God.
        </blockquote>
        
        <cite className="block mt-10 text-[13px] tracking-[0.25em] uppercase font-light text-[rgba(255,252,240,0.6)] not-italic">
          John 1:1 (ESV)
        </cite>
      </motion.div>
    </div>
  );
}
