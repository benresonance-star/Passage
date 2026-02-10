"use client";

import { useState, useEffect } from "react";
import { useBCM } from "@/context/BCMContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { splitIntoLines } from "@/lib/parser";
import { updateCard } from "@/lib/scheduler";
import { calculateUpdatedStreak } from "@/lib/streak";
import { useWakeLock } from "@/hooks/useWakeLock";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function RecitePage() {
  const { state, setState, isHydrated, syncProgress } = useBCM();
  const { user } = useAuth();
  const router = useRouter();
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [isGraded, setIsGraded] = useState(false);

  useWakeLock();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const activeChunkId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  const activeChunk = chapter?.chunks.find(c => c.id === activeChunkId);

  const scriptureText = activeChunk?.verses
    .filter(v => v.type === "scripture")
    .map(v => v.text)
    .join(" ") || "";
  const lines = scriptureText ? splitIntoLines(scriptureText) : [];

  const isAllRevealed = revealedLines.size === lines.length && lines.length > 0;

  useEffect(() => {
    const handleReset = () => {
      setRevealedLines(new Set());
      setIsGraded(false);
    };

    window.addEventListener("bcm-reset-recite", handleReset);
    return () => window.removeEventListener("bcm-reset-recite", handleReset);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (!chapter || !chapterId) {
        // Don't redirect, the EmptyState will handle it
        return;
      }

      if (!activeChunkId) {
        // Smart Continue: Find the first chunk that is NOT memorised
        const firstUnmemorised = chapter.chunks.find(c => !state.cards[chapterId]?.[c.id]?.isMemorised);
        
        // If all are memorised, fallback to the first one
        const nextId = firstUnmemorised?.id || chapter.chunks[0]?.id;

        if (nextId) {
          setState(prev => ({
            ...prev,
            settings: {
              ...prev.settings,
              activeChunkId: {
                ...prev.settings.activeChunkId,
                [chapterId]: nextId
              }
            }
          }));
        }
      }
    }
  }, [isHydrated, chapter, chapterId, activeChunkId, state.cards, router, setState]);

  if (!isHydrated) return null;
  if (!chapter || !chapterId || !activeChunk) return <EmptyState />;

  const toggleLine = (index: number) => {
    const newRevealed = new Set(revealedLines);
    if (newRevealed.has(index)) {
      newRevealed.delete(index);
    } else {
      newRevealed.add(index);
    }
    setRevealedLines(newRevealed);
  };

  const handleRevealToggle = () => {
    if (isAllRevealed) {
      setRevealedLines(new Set());
    } else {
      setRevealedLines(new Set(lines.map((_, i) => i)));
    }
  };

  const handleGrade = async (score: number) => {
    const currentCard = state.cards[chapterId]?.[activeChunk.id];
    if (currentCard) {
      const updatedCard = updateCard(currentCard, score);
      
      setState(prev => {
        const stats = prev.stats[chapterId] || { streak: 0, lastActivity: null };
        const newStreak = calculateUpdatedStreak(stats.streak, stats.lastActivity);

        return {
          ...prev,
          cards: {
            ...prev.cards,
            [chapterId]: {
              ...prev.cards[chapterId],
              [activeChunk.id]: updatedCard
            }
          },
          stats: {
            ...prev.stats,
            [chapterId]: {
              streak: newStreak,
              lastActivity: new Date().toISOString()
            }
          }
        };
      });

      // Cloud Sync
      if (user && chapter) {
        await syncProgress(chapter.title, activeChunk.id, updatedCard);
      }
    }
    setIsGraded(true);
  };

  const currentTheme = state.settings.theme || { bg: "#000000", text: "#f4f4f5" };
  const isDawn = currentTheme.id === "dawn";

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <header className="flex items-center justify-between pt-[env(safe-area-inset-top)] pb-4">
        <button onClick={() => router.push("/chapter")} className="text-zinc-500 p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold uppercase tracking-widest text-orange-500">Recite Mode</h1>
          <p className={`text-[10px] uppercase tracking-tight ${isDawn ? "text-white/60" : "text-zinc-500"}`}>
            Verses {activeChunk?.verseRange} • {chapter?.title}
          </p>
        </div>
        <button onClick={handleRevealToggle} className="text-zinc-500 p-2 -mr-2">
          {isAllRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </header>

      <div className="flex-1 space-y-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold">Recite out loud.</h2>
          <p className={`text-sm ${isDawn ? "text-white/60" : "text-zinc-500"}`}>Tap lines to reveal.</p>
        </div>

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div
              key={i}
              onClick={() => toggleLine(i)}
              className={`p-4 rounded-xl transition-all duration-300 cursor-pointer border ${
                revealedLines.has(i)
                  ? "bg-[var(--theme-ui-bg)] shadow-lg border-[var(--theme-ui-border)]"
                  : "bg-[var(--theme-ui-bg)] text-transparent border-transparent opacity-40"
              }`}
            >
              <p className="text-lg leading-relaxed select-none">
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="py-8">
        <button
          onClick={async () => {
            if (!isGraded) {
              await handleGrade(0.75);
            }
            router.push("/chapter");
          }}
          className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
}
