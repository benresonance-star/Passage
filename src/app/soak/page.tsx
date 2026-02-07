"use client";

import { useEffect } from "react";
import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { useWakeLock } from "@/hooks/useWakeLock";
import { SoakVerseTap } from "@/modules/soak/SoakVerseTap";
import type { SoakSection } from "@/modules/soak/types";
import { Cormorant_Garamond } from "next/font/google";

const soakFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function SoakPage() {
  const { state, isHydrated } = useBCM();
  const router = useRouter();
  useWakeLock();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const activeChunkId = chapterId
    ? state.settings.activeChunkId[chapterId]
    : null;
  const activeChunk = chapter?.chunks.find((c) => c.id === activeChunkId);

  useEffect(() => {
    if (isHydrated && (!chapter || !activeChunk)) {
      router.push("/chapter");
    }
  }, [isHydrated, chapter, activeChunk, router]);

  if (!isHydrated || !activeChunk) return null;

  // Adapt app data → Soak module types (strips headings, maps verses)
  const section: SoakSection = {
    id: activeChunk.id,
    verses: activeChunk.verses
      .filter((v) => v.type === "scripture")
      .map((v, i) => ({
        id: `${activeChunk.id}-v${i}`,
        text: v.text,
      })),
  };

  return (
    <SoakVerseTap
      section={section}
      fontClassName={soakFont.className}
      onExit={() => router.push("/chapter")}
    />
  );
}

