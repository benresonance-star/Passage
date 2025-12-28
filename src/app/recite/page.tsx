"use client";

import { useState, useEffect } from "react";
import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { splitIntoLines } from "@/lib/parser";
import { updateCard } from "@/lib/scheduler";
import { useWakeLock } from "@/hooks/useWakeLock";
import { ArrowLeft, Eye, EyeOff, Check, AlertCircle, XCircle } from "lucide-react";

export default function RecitePage() {
  const { state, setState, isHydrated } = useBCM();
  const router = useRouter();
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [isGraded, setIsGraded] = useState(false);

  useWakeLock();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const activeChunkId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  const activeChunk = chapter?.chunks.find(c => c.id === activeChunkId);

  const scriptureText = activeChunk?.verses
    .filter(v => v.type === "scripture" || state.settings.showHeadings)
    .map(v => v.text)
    .join(" ") || "";
  const lines = scriptureText ? splitIntoLines(scriptureText) : [];

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
        router.push("/");
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
        } else {
          router.push("/");
        }
      }
    }
  }, [isHydrated, chapter, chapterId, activeChunkId, state.cards, router, setState]);

  if (!isHydrated || !activeChunk || !chapterId) return null;

  const toggleLine = (index: number) => {
    const newRevealed = new Set(revealedLines);
    if (newRevealed.has(index)) {
      newRevealed.delete(index);
    } else {
      newRevealed.add(index);
    }
    setRevealedLines(newRevealed);
  };

  const handleGrade = (score: number) => {
    const currentCard = state.cards[chapterId]?.[activeChunk.id];
    if (currentCard) {
      const updatedCard = updateCard(currentCard, score);
      
      setState(prev => {
        const now = new Date();
        const stats = prev.stats[chapterId] || { streak: 0, lastActivity: null };
        const lastActivity = stats.lastActivity ? new Date(stats.lastActivity) : null;
        let newStreak = stats.streak;

        if (!lastActivity) {
          newStreak = 1;
        } else {
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const lastDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
          const diffInDays = Math.floor((nowDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffInDays === 1) {
            newStreak += 1;
          } else if (diffInDays > 1) {
            newStreak = 1;
          }
        }

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
              lastActivity: now.toISOString()
            }
          }
        };
      });
    }
    setIsGraded(true);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => router.push("/chapter")} className="text-zinc-500 p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold uppercase tracking-widest text-orange-500">Recite Mode</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-tight">
            Verses {activeChunk?.verseRange} • {chapter?.title}
          </p>
        </div>
        <button onClick={() => setRevealedLines(new Set(lines.map((_, i) => i)))} className="text-zinc-500 p-2 -mr-2">
          <Eye size={20} />
        </button>
      </header>

      <div className="flex-1 space-y-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold">Recite out loud.</h2>
          <p className="text-zinc-500 text-sm">Tap lines to reveal.</p>
        </div>

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div
              key={i}
              onClick={() => toggleLine(i)}
              className={`p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                revealedLines.has(i)
                  ? "bg-zinc-900 text-white shadow-lg"
                  : "bg-zinc-900/40 text-transparent border border-white/5"
              }`}
            >
              <p className="text-lg leading-relaxed select-none">
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="py-8 space-y-4">
        {!isGraded ? (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleGrade(0.3)} className="flex flex-col items-center gap-1 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-red-500 active:scale-95 transition-transform">
              <XCircle size={24} /><span className="text-[10px] font-bold uppercase">Missed</span>
            </button>
            <button onClick={() => handleGrade(0.75)} className="flex flex-col items-center gap-1 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-orange-500 active:scale-95 transition-transform">
              <AlertCircle size={24} /><span className="text-[10px] font-bold uppercase">Shaky</span>
            </button>
            <button onClick={() => handleGrade(1.0)} className="flex flex-col items-center gap-1 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-green-500 active:scale-95 transition-transform">
              <Check size={24} /><span className="text-[10px] font-bold uppercase">Nailed it</span>
            </button>
          </div>
        ) : (
          <button onClick={() => router.push("/chapter")} className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
