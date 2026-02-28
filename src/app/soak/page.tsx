"use client";

import { useEffect, useState } from "react";
import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { useWakeLock } from "@/hooks/useWakeLock";
import { SoakVerseTap } from "@/modules/soak/SoakVerseTap";
import { SoakIntro } from "@/components/SoakIntro";
import type { SoakSection } from "@/modules/soak/types";
import { Cormorant_Garamond } from "next/font/google";
import { AnimatePresence } from "framer-motion";

const soakFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function SoakPage() {
  const { state, isHydrated } = useBCM();
  const router = useRouter();
  useWakeLock();

  const [showIntro, setShowIntro] = useState(true);

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const activeChunkId = chapterId
    ? state.settings.activeChunkId[chapterId]
    : null;
  const activeChunk = chapter?.chunks.find((c) => c.id === activeChunkId);

  useEffect(() => {
    if (isHydrated && !chapter) {
      router.push("/chapter");
    }
  }, [isHydrated, chapter, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isHydrated || !chapter) return null;

  // Adapt app data → Soak module types (strips headings, maps verses)
  // If a specific chunk is active, soak only that chunk.
  // Otherwise, soak the entire chapter.
  const section: SoakSection = activeChunk 
    ? {
        id: activeChunk.id,
        verses: activeChunk.verses
          .filter((v) => v.type === "scripture")
          .map((v, i) => ({
            id: `${activeChunk.id}-v${i}`,
            text: v.text,
          })),
      }
    : {
        id: `${chapter.id}-whole`,
        verses: chapter.verses
          .filter((v) => v.type === "scripture")
          .map((v, i) => ({
            id: `${chapter.id}-v${v.number || i}`,
            text: v.text,
          })),
      };

  if (section.verses.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-8 text-center bg-black text-white">
        <div className="space-y-4">
          <p className="opacity-60">No scripture verses found in this chapter.</p>
          <button 
            onClick={() => router.push("/chapter")}
            className="px-6 py-2 bg-orange-500 text-white rounded-full font-bold active:scale-95 transition-transform"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={soakFont.className}>
      <AnimatePresence>
        {showIntro ? (
          <SoakIntro key="intro" fontClassName={soakFont.className} />
        ) : (
          <SoakVerseTap
            key="soak"
            section={section}
            fontClassName={soakFont.className}
            onExit={() => router.push("/chapter")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

