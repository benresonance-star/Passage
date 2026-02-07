"use client";

import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { Play, Mic, ChevronRight, Eye, EyeOff, Award, Palette, X } from "lucide-react";
import { useState } from "react";

const THEME_PRESETS = [
  { name: "OLED", bg: "#000000", text: "#f4f4f5" },
  { name: "Midnight", bg: "#0f172a", text: "#e2e8f0" },
  { name: "Sepia", bg: "#fdf6e3", text: "#433422" },
  { name: "Classic", bg: "#18181b", text: "#d4d4d8" },
  { name: "Dawn", bg: "#3d3566", text: "#fffcf0", id: "dawn" },
];

export default function ChapterPage() {
  const { state, setState, isHydrated } = useBCM();
  const router = useRouter();
  const [showThemeModal, setShowThemeModal] = useState(false);

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

  const setTheme = (bg: string, text: string, id?: string) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: { bg, text, id }
      }
    }));
  };

  const activeChunkId = state.settings.activeChunkId[chapterId];
  const currentTheme = state.settings.theme || { bg: "#000000", text: "#f4f4f5" };
  const isDawn = currentTheme.id === "dawn";

  return (
    <div className="space-y-6 pb-32">
      <header className={`sticky top-0 backdrop-blur-md pt-4 pb-2 z-10 ${isDawn ? "bg-transparent border-b border-transparent" : "bg-inherit border-b border-white/10"}`}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{chapter.title}</h1>
            <div className={`flex gap-4 text-sm mt-1 ${isDawn ? "text-[var(--theme-ui-subtext)]" : "text-zinc-500"}`}>
              <span>{chapter.chunks.length} Chunks</span>
              <span>{chapter.verses.length} Verses</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowThemeModal(true)}
              className="p-2 rounded-xl transition-colors text-zinc-500 bg-[var(--theme-ui-bg)]"
            >
              <Palette size={20} />
            </button>
            <button 
              onClick={toggleHeadings}
              className={`p-2 rounded-xl transition-colors ${state.settings.showHeadings ? "text-orange-500 bg-orange-500/10" : "text-zinc-500 bg-[var(--theme-ui-bg)]"}`}
            >
              {state.settings.showHeadings ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button 
              onClick={toggleMemorised}
              className={`p-2 rounded-xl transition-colors ${state.settings.showMemorised ? "text-amber-400 bg-amber-400/10" : "text-zinc-500 bg-[var(--theme-ui-bg)]"}`}
            >
              <Award size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm" onClick={() => setShowThemeModal(false)} />
          <div className="absolute inset-x-0 bottom-0 max-w-md mx-auto bg-[var(--overlay-surface)] glass border-t border-[var(--surface-border)] rounded-t-[32px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white text-center w-full ml-8">Appearance</h2>
              <button onClick={() => setShowThemeModal(false)} className="p-2 text-zinc-500">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-3">
                {THEME_PRESETS.map((p) => {
                  const isSelected = p.id 
                    ? currentTheme.id === p.id 
                    : currentTheme.bg === p.bg && !currentTheme.id;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setTheme(p.bg, p.text, p.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        isSelected ? "border-orange-500 bg-orange-500/5" : "border-[var(--surface-border)] bg-[var(--surface)]"
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full border border-white/10 shadow-inner flex-shrink-0"
                        style={p.id === "dawn" ? {
                          background: "linear-gradient(180deg, #3d3566 0%, #dabb8e 50%, #5a8090 100%)"
                        } : {
                          backgroundColor: p.bg
                        }}
                      />
                      <span className="font-bold text-sm text-white">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-400">Background</span>
                  <input 
                    type="color" 
                    value={currentTheme.bg} 
                    onChange={(e) => setTheme(e.target.value, currentTheme.text)}
                    className="w-12 h-12 rounded-lg bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-400">Text Color</span>
                  <input 
                    type="color" 
                    value={currentTheme.text} 
                    onChange={(e) => setTheme(currentTheme.bg, e.target.value)}
                    className="w-12 h-12 rounded-lg bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowThemeModal(false)}
              className="w-full mt-12 py-4 bg-[var(--surface-alt)] text-white font-bold rounded-2xl border border-[var(--surface-border)] active:scale-95 transition-transform"
            >
              Done
            </button>
          </div>
        </div>
      )}

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
                  ? "bg-[var(--theme-ui-bg)] ring-1 ring-[var(--theme-ui-border)] shadow-xl" 
                  : "active:bg-[var(--theme-ui-bg)]"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                  isActive ? "text-orange-500" : showAsMemorised ? "text-amber-500/80" : "text-[var(--theme-ui-subtext)]"
                }`}>
                  Verse {chunk.verseRange}
                </span>
              </div>
              
              <div className={`chunk-text ${isActive ? "chunk-text-bold" : showAsMemorised ? "text-amber-500/80 opacity-80" : "opacity-90"}`}>
                {chunk.verses.map((v, idx) => (
                  <div key={idx} className={v.type === "heading" ? "w-full text-center" : "inline"}>
                    {v.type === "heading" ? (
                      state.settings.showHeadings && (
                        <h3 className={`text-[11px] font-bold uppercase tracking-[0.2em] my-4 block w-full ${showAsMemorised ? "text-amber-500/50" : "text-[var(--theme-ui-subtext)]"}`}>
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
