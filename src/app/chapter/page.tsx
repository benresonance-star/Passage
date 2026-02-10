"use client";

import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { Play, Mic, ChevronRight, Eye, EyeOff, Award, Palette, Settings, X, Eraser } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import { EmptyState } from "@/components/EmptyState";

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
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;

  if (!isHydrated) return null;
  if (!chapter || !chapterId) return <EmptyState />;

  const normalizeWord = (word: string) => {
    return word.replace(/[^\w]/g, '').toLowerCase();
  };

  const toggleWordHighlight = (word: string) => {
    const normalized = normalizeWord(word);
    if (!normalized) return;

    setState(prev => {
      const current = prev.settings.highlightedWords || [];
      const isHighlighted = current.includes(normalized);
      const next = isHighlighted 
        ? current.filter(w => w !== normalized)
        : [...current, normalized];
      
      return {
        ...prev,
        settings: {
          ...prev.settings,
          highlightedWords: next
        }
      };
    });
  };

  const clearHighlights = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        highlightedWords: []
      }
    }));
  };

  const handleLongPressStart = (chunkId: string, e?: React.TouchEvent | React.MouseEvent) => {
    if (e && 'touches' in e) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    longPressTimer.current = setTimeout(() => {
      setActiveChunk(chunkId);
      // Optional: trigger haptic feedback if available
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    // If moved more than 10px, cancel the long press
    if (dx > 10 || dy > 10) {
      handleLongPressEnd();
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  };

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
    <div className="flex flex-col h-screen max-h-[100dvh]">
      <header className={`sticky top-0 backdrop-blur-md pt-safe pb-2 z-10 ${isDawn ? "bg-transparent border-b border-transparent" : "bg-inherit border-b border-white/10"}`}>
        <div className="px-4 flex justify-between items-start">
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
            {state.settings.highlightedWords && state.settings.highlightedWords.length > 0 && (
              <button 
                onClick={clearHighlights}
                className="p-2 rounded-xl transition-colors text-zinc-500 bg-[var(--theme-ui-bg)]"
                title="Clear highlights"
              >
                <Eraser size={20} />
              </button>
            )}
            <Link
              href="/"
              className="p-2 rounded-xl transition-colors text-zinc-500 bg-[var(--theme-ui-bg)]"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm" onClick={() => setShowThemeModal(false)} />
          <div className="relative w-full max-w-md bg-[var(--overlay-surface)] glass border border-[var(--surface-border)] rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
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

      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-safe space-y-8 scrollbar-hide">
        <div className="pb-20">
          {chapter.chunks.map((chunk) => {
            const isActive = activeChunkId === chunk.id;
            const isMemorised = state.cards[chapterId]?.[chunk.id]?.isMemorised;
            const showAsMemorised = isMemorised && state.settings.showMemorised;

            return (
              <div
                key={chunk.id}
                onMouseDown={() => handleLongPressStart(chunk.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={(e) => handleLongPressStart(chunk.id, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleLongPressEnd}
                onContextMenu={(e) => e.preventDefault()}
                className={`group relative space-y-3 transition-all duration-300 rounded-2xl p-4 ${
                  isActive 
                    ? "bg-[var(--theme-ui-bg)] ring-1 ring-[var(--theme-ui-border)] shadow-xl" 
                    : "active:bg-[var(--theme-ui-bg)]"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    isActive ? "text-[var(--chunk-active)]" : showAsMemorised ? "text-[var(--chunk-memorised)]" : "text-[var(--theme-ui-subtext)]"
                  }`}>
                    Verse {chunk.verseRange}
                  </span>
                </div>
                
                <div className={`chunk-text ${isActive ? "chunk-text-bold" : showAsMemorised ? "opacity-80" : "opacity-90"}`}
                  style={showAsMemorised ? { color: "var(--chunk-memorised)" } : { color: "var(--theme-text)" }}
                >
                  {chunk.verses.map((v, idx) => (
                    <div key={idx} className={v.type === "heading" ? "w-full text-center" : "inline"}>
                      {v.type === "heading" ? (
                        state.settings.showHeadings && (
                          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] my-4 block w-full"
                            style={{ color: showAsMemorised ? "var(--chunk-memorised-sub)" : "var(--theme-ui-subtext)" }}
                          >
                            {v.text}
                          </h3>
                        )
                      ) : (
                        <span className="inline-block mr-2">
                          <span className="text-[12px] align-top opacity-50 mr-1 italic font-normal"
                            style={showAsMemorised ? { color: "var(--chunk-memorised-sub)" } : undefined}
                          >
                            {v.number}
                          </span>
                          {v.text.split("[LINEBREAK]").map((line, i) => (
                            <span key={i}>
                              {i > 0 && <br />}
                              {line.split(/(\s+)/).map((part, pIdx) => {
                                const normalized = normalizeWord(part);
                                const isHighlighted = normalized && state.settings.highlightedWords?.includes(normalized);
                                
                                if (!normalized) return <span key={pIdx}>{part}</span>;
                                
                                return (
                                  <span
                                    key={pIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleWordHighlight(part);
                                    }}
                                    className={`cursor-pointer transition-all duration-300 rounded-sm px-0.5 -mx-0.5 ${
                                      isHighlighted 
                                        ? "text-[#FFCB1F] font-black" 
                                        : "hover:bg-white/5"
                                    }`}
                                    style={isHighlighted ? { 
                                      fontWeight: 900,
                                      textShadow: isDawn ? "0 0 12px rgba(255, 203, 31, 0.4)" : "0 0 8px rgba(255, 203, 31, 0.3)"
                                    } : undefined}
                                  >
                                    {part}
                                  </span>
                                );
                              })}
                            </span>
                          ))}
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
    </div>
  );
}
