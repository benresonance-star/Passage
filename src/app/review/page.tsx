"use client";

import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { Play, Mic, Calendar, Clock, AlertTriangle, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function ReviewPage() {
  const { state, setState, isHydrated, syncProgress } = useBCM();
  const { user } = useAuth();
  const router = useRouter();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;

  if (!isHydrated || !chapter || !chapterId) return null;

  const now = new Date();
  
  const allChunks = chapter.chunks.map(chunk => ({
    chunk,
    card: state.cards[chapterId]?.[chunk.id]
  }));

  const memorisedCount = Object.values(state.cards[chapterId] || {}).filter(c => c.isMemorised).length;
  const totalChunks = chapter.chunks.length;

  const setActiveAndNavigate = (chunkId: string, path: string) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeChunkId: {
          ...prev.settings.activeChunkId,
          [chapterId]: chunkId
        }
      }
    }));
    router.push(path);
  };

  const handleToggleMemorised = async (chunkId: string) => {
    const nextIsMemorised = !state.cards[chapterId][chunkId].isMemorised;
    
    setState(prev => {
      const currentCard = prev.cards[chapterId][chunkId];
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [chapterId]: {
            ...prev.cards[chapterId],
            [chunkId]: {
              ...currentCard,
              isMemorised: nextIsMemorised
            }
          }
        }
      };
    });

    // Cloud Sync
    if (user && chapter) {
      await syncProgress(chapter.title, chunkId, nextIsMemorised);
    }
  };

  const activeChunkId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  // If no chunk is active, the first chunk should be treated as active for highlighting
  const effectiveActiveChunkId = activeChunkId || chapter.chunks[0]?.id;

  return (
    <div className="space-y-6 pb-20">
      <header className="py-4">
        <h1 className="text-2xl font-bold">Chapter Mastery</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-amber-500 transition-all duration-500" 
              style={{ width: `${(memorisedCount / totalChunks) * 100}%` }}
            />
          </div>
          <span className="text-zinc-500 text-xs font-bold whitespace-nowrap">
            {memorisedCount} / {totalChunks}
          </span>
        </div>
      </header>

      <div className="space-y-4">
        {allChunks.map(({ chunk, card }) => {
          const isMemorised = card?.isMemorised;
          const isHard = card?.hardUntilAt && new Date(card.hardUntilAt) > now;
          const isDue = !isMemorised && new Date(card?.nextDueAt || 0) <= now;
          const isActive = chunk.id === effectiveActiveChunkId;
          
          return (
            <div 
              key={chunk.id}
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    activeChunkId: {
                      ...prev.settings.activeChunkId,
                      [chapterId]: chunk.id
                    }
                  }
                }));
              }}
              className={`bg-[var(--theme-ui-bg)] border transition-all duration-300 rounded-2xl p-5 space-y-4 shadow-lg cursor-pointer ${
                isActive ? "ring-2 ring-[var(--theme-text)] border-transparent" : (isMemorised ? "border-amber-500/20" : "border-[var(--theme-ui-border)]")
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isMemorised ? "text-amber-500/60" : "text-[var(--theme-ui-subtext)]"
                    }`}>
                      Verse {chunk.verseRange}
                    </span>
                    {isHard && !isMemorised && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase rounded-full border border-red-500/20">
                        <AlertTriangle size={10} />
                        Hard
                      </span>
                    )}
                    {isDue && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase rounded-full border border-orange-500/20">
                        <Clock size={10} />
                        Due
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-2 leading-relaxed line-clamp-2 transition-colors ${
                    isMemorised ? "text-amber-200/40" : "text-zinc-300"
                  }`}>
                    {chunk.text}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveAndNavigate(chunk.id, "/practice")}
                  className="flex items-center justify-center gap-2 py-3 bg-zinc-800 text-white text-sm font-bold rounded-xl active:scale-95 transition-transform border border-white/5"
                >
                  <Play size={16} fill="currentColor" />
                  Practice
                </button>
                <button
                  onClick={() => setActiveAndNavigate(chunk.id, "/recite")}
                  className="flex items-center justify-center gap-2 py-3 bg-zinc-800 text-white text-sm font-bold rounded-xl active:scale-95 transition-transform border border-white/5"
                >
                  <Mic size={16} />
                  Recite
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMemorised(chunk.id);
                  }}
                  className={`col-span-2 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl border transition-all active:scale-95 ${
                    isMemorised 
                      ? "bg-amber-500 text-zinc-950 border-amber-400" 
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  <Award size={16} fill={isMemorised ? "currentColor" : "none"} />
                  {isMemorised ? "Memorised" : "Mark Memorised"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
