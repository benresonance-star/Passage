"use client";

import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { Play, Mic, ChevronRight, Eye, EyeOff, Award } from "lucide-react";

export default function ChapterPage() {
  const { state, setState, isHydrated } = useBCM();
  const router = useRouter();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;

  if (!isHydrated || !chapter || !chapterId) return null;

  const setActiveChunk = (chunkId: string) => {
    setState((prev) => {
      const currentActiveId = prev.settings.activeChunkId[chapterId];
      const nextActiveId = currentActiveId === chunkId ? null : chunkId;
      
      return {
        ...prev,
        settings: {
          ...prev.settings,
          activeChunkId: {
            ...prev.settings.activeChunkId,
            [chapterId]: nextActiveId
          },
        },
      };
    });
  };

  const toggleHeadings = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        showHeadings: !prev.settings.showHeadings
      }
    }));
  };

  const toggleMemorised = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        showMemorised: !prev.settings.showMemorised
      }
    }));
  };

  const activeChunkId = state.settings.activeChunkId[chapterId];

  return (
    <div className="space-y-6 pb-32">
      <header className="sticky top-0 bg-black/80 backdrop-blur-md pt-4 pb-2 z-10 border-b border-white/5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{chapter.title}</h1>
            <div className="flex gap-4 text-zinc-500 text-sm mt-1">
              <span>{chapter.chunks.length} Chunks</span>
              <span>{chapter.verses.length} Verses</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleHeadings}
              className={`p-2 rounded-xl transition-colors ${state.settings.showHeadings ? "text-orange-500 bg-orange-500/10" : "text-zinc-500 bg-zinc-900"}`}
            >
              {state.settings.showHeadings ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button 
              onClick={toggleMemorised}
              className={`p-2 rounded-xl transition-colors ${state.settings.showMemorised ? "text-amber-400 bg-amber-400/10" : "text-zinc-500 bg-zinc-900"}`}
            >
              <Award size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {chapter.chunks.map((chunk) => {
          const isActive = activeChunkId === chunk.id;
          const isMemorised = state.cards[chapterId]?.[chunk.id]?.isMemorised;
          const showAsMemorised = isMemorised && state.settings.showMemorised;

          return (
            <div
              key={chunk.id}
              onClick={() => setActiveChunk(chunk.id)}
              className={`group relative space-y-3 transition-all duration-300 rounded-2xl p-4 -mx-4 ${
                isActive 
                  ? "bg-zinc-900 ring-1 ring-white/10 shadow-xl" 
                  : "active:bg-zinc-900/50"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                  isActive ? "text-orange-500" : showAsMemorised ? "text-amber-500/80" : "text-zinc-600"
                }`}>
                  Verse {chunk.verseRange}
                </span>
              </div>
              
              <div className={`chunk-text ${isActive ? "chunk-text-bold" : showAsMemorised ? "text-amber-200/90" : "text-zinc-400"}`}>
                {chunk.verses.map((v, idx) => (
                  <div key={idx} className={v.type === "heading" ? "w-full text-center" : "inline"}>
                    {v.type === "heading" ? (
                      state.settings.showHeadings && (
                        <h3 className={`text-[11px] font-bold uppercase tracking-[0.2em] my-4 block w-full ${showAsMemorised ? "text-amber-500/50" : "text-zinc-500"}`}>
                          {v.text}
                        </h3>
                      )
                    ) : (
                      <span className="inline-block mr-2">
                        <span className={`text-[12px] align-top opacity-50 mr-1 italic font-normal ${showAsMemorised ? "text-amber-500/50" : ""}`}>
                          {v.number}
                        </span>
                        {v.text}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
