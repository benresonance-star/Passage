"use client";

import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { Play, Mic, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ReviewPage() {
  const { state, setState, isHydrated, syncProgress } = useBCM();
  const { user } = useAuth();
  const router = useRouter();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;

  if (!isHydrated || !chapter || !chapterId) return null;

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
    const currentCard = state.cards[chapterId]?.[chunkId];
    if (!currentCard) return;
    const nextIsMemorised = !currentCard.isMemorised;
    const updatedCard = { ...currentCard, isMemorised: nextIsMemorised };
    
    setState(prev => {
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [chapterId]: {
            ...prev.cards[chapterId],
            [chunkId]: updatedCard
          }
        }
      };
    });

    // Cloud Sync
    if (user && chapter) {
      await syncProgress(chapter.title, chunkId, updatedCard);
    }
  };

  const activeChunkId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  // If no chunk is active, the first chunk should be treated as active for highlighting
  const effectiveActiveChunkId = activeChunkId || chapter.chunks[0]?.id;

  return (
    <div className="space-y-6 pb-[calc(64px+env(safe-area-inset-bottom)+2rem)] px-4">
      <header className="pt-[env(safe-area-inset-top)] pb-4">
        <h1 className="text-2xl font-bold">Chapter Mastery</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--surface-border)]">
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
                  </div>
                  <p className={`text-sm mt-2 leading-relaxed line-clamp-2 transition-colors ${
                    isMemorised ? "text-[var(--chunk-memorised)]" : "text-[var(--theme-text)]"
                  }`}>
                    {chunk.text}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveAndNavigate(chunk.id, "/practice")}
                  className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-alt)] text-white text-sm font-bold rounded-xl active:scale-95 transition-transform border border-[var(--surface-border)]"
                >
                  <Play size={16} fill="currentColor" />
                  Practice
                </button>
                <button
                  onClick={() => setActiveAndNavigate(chunk.id, "/recite")}
                  className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-alt)] text-white text-sm font-bold rounded-xl active:scale-95 transition-transform border border-[var(--surface-border)]"
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
                      ? "bg-[var(--chunk-memorised)] text-white border-[var(--chunk-memorised)]" 
                      : "bg-[var(--surface-alt)] text-white border-[var(--surface-border)]"
                  }`}
                >
                  <Award size={16} fill="none" />
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
