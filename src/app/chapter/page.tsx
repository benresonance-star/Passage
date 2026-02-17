"use client";

import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { Play, Mic, ChevronRight, Eye, EyeOff, Award, Palette, Settings, X, Eraser } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useScrollAwareTopActions } from "@/hooks/useScrollAwareTopActions";

const THEME_PRESETS = [
  { name: "OLED", bg: "#000000", text: "#f4f4f5" },
  { name: "Midnight", bg: "#0f172a", text: "#e2e8f0" },
  { name: "Sepia", bg: "#fdf6e3", text: "#433422" },
  { name: "Night Dusk", bg: "#1a1816", text: "#f2e8d5", id: "night-dusk" },
  { name: "Classic", bg: "#18181b", text: "#d4d4d8" },
  { name: "Dawn", bg: "#3d3566", text: "#fffcf0", id: "dawn" },
];

export default function ChapterPage() {
  const { state, setState, isHydrated } = useBCM();
  const router = useRouter();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showMeta, setShowMeta] = useState(true);
  const { isCollapsed: topCollapsed, setCollapsed: setTopCollapsed, resetCollapseTimer: resetTopTimer } = useScrollAwareTopActions();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const isLongPressActive = useRef(false);
  const wordTouchStartTime = useRef<number>(0);
  const isLongPressTriggered = useRef(false);

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;

  const handleTitleClick = () => {
    // No-op as per user request to always show and remove tap feature
  };

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
    
    isLongPressActive.current = false;
    isLongPressTriggered.current = false;

    longPressTimer.current = setTimeout(() => {
      setActiveChunk(chunkId);
      isLongPressActive.current = true;
      isLongPressTriggered.current = true;
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

    // If moved more than 20px, cancel the long press
    if (dx > 20 || dy > 20) {
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

  const toggleVisibilityMode = () => {
    setState(prev => {
      const currentMode = prev.settings.visibilityMode || 0;
      const nextMode = ((currentMode + 1) % 3) as 0 | 1 | 2;
      
      return {
        ...prev,
        settings: {
          ...prev.settings,
          visibilityMode: nextMode,
          // Sync legacy showHeadings for backward compatibility if needed
          showHeadings: nextMode === 0
        }
      };
    });
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
  const isSepia = currentTheme.bg === "#fdf6e3";

  const scriptureVerses = chapter.verses.filter(v => v.type === "scripture");

  const isIPhone = typeof window !== "undefined" && /iPhone/.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 flex flex-col bg-inherit pt-safe">
      <header className={`sticky top-0 backdrop-blur-md pb-2 z-10 ${isDawn ? "bg-transparent border-b border-transparent" : "bg-inherit border-b border-white/10"}`}>
        <div className="px-6 md:px-12 flex justify-between items-start max-w-2xl mx-auto">
          <div className="cursor-default">
            <h1 className="text-2xl font-bold">{chapter.title}</h1>
            <div className={`text-[10px] uppercase tracking-wider mt-0.5 transition-all duration-500 ${isDawn ? "text-[var(--theme-ui-subtext)]" : "text-zinc-500"}`}>
              {state.versions[chapter.versionId]?.abbreviation || "NIV"} — {scriptureVerses.length} VERSES — {chapter.chunks.length} PARTS
            </div>
          </div>
          <div 
            className={`flex gap-1 p-1 transition-all duration-500 ease-in-out shadow-lg rounded-full will-change-[clip-path,opacity] ${
              topCollapsed ? "top-pill-clip bg-transparent" : "top-full-clip bg-[var(--theme-ui-bg)] border border-white/10"
            }`}
            onClick={() => topCollapsed && (setTopCollapsed(false), resetTopTimer())}
          >
            <div className={`flex gap-1 transition-all duration-500 ${topCollapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
              {state.settings.highlightedWords && state.settings.highlightedWords.length > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); clearHighlights(); resetTopTimer(); }}
                  className="p-2 rounded-xl transition-colors text-zinc-500"
                  title="Clear highlights"
                >
                  <Eraser size={20} />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); setShowThemeModal(true); resetTopTimer(); }}
                className="p-2 rounded-xl transition-colors text-zinc-500"
              >
                <Palette size={20} />
              </button>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleVisibilityMode(); resetTopTimer(); }}
              className={`p-2 rounded-xl transition-colors ${state.settings.visibilityMode === 1 ? "text-orange-500" : state.settings.visibilityMode === 2 ? "text-red-500" : "text-zinc-500"}`}
            >
              {state.settings.visibilityMode === 0 || !state.settings.visibilityMode ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleMemorised(); resetTopTimer(); }}
                className={`p-2 rounded-xl transition-colors ${state.settings.showMemorised ? "text-amber-400" : "text-zinc-500"}`}
              >
                <Award size={20} />
              </button>
            </div>
            <Link
              href="/"
              onClick={(e) => {
                if (topCollapsed) {
                  e.preventDefault();
                  e.stopPropagation();
                  setTopCollapsed(false);
                  resetTopTimer();
                }
              }}
              className={`p-2 rounded-xl transition-colors text-zinc-500 ${topCollapsed ? "bg-[var(--theme-ui-bg)] border border-white/10 shadow-md" : ""}`}
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
              <h2 className={`text-xl font-bold text-center w-full ml-8 ${isSepia ? "text-zinc-800" : "text-white"}`}>Appearance</h2>
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
                        } : p.id === "night-dusk" ? {
                          background: "linear-gradient(180deg, #1a1816 0%, #2d2a26 100%)",
                          backgroundColor: "#1a1816"
                        } : {
                          backgroundColor: p.bg
                        }}
                      />
                      <span className={`font-bold text-sm ${isSepia ? "text-zinc-800" : "text-white"}`}>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isSepia ? "text-zinc-600" : "text-zinc-400"}`}>Background</span>
                  <input 
                    type="color" 
                    value={currentTheme.bg} 
                    onChange={(e) => setTheme(e.target.value, currentTheme.text)}
                    className={`w-12 h-12 rounded-lg bg-transparent cursor-pointer ${isIPhone ? "border-2 border-black" : ""}`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isSepia ? "text-zinc-600" : "text-zinc-400"}`}>Text Color</span>
                  <input 
                    type="color" 
                    value={currentTheme.text} 
                    onChange={(e) => setTheme(currentTheme.bg, e.target.value)}
                    className={`w-12 h-12 rounded-lg bg-transparent cursor-pointer ${isIPhone ? "border-2 border-black" : ""}`}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowThemeModal(false)}
              className={`w-full mt-12 py-4 bg-[var(--surface-alt)] font-bold rounded-2xl border border-[var(--surface-border)] active:scale-95 transition-transform ${isSepia ? "text-zinc-800" : "text-white"}`}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 md:px-12 pt-8 pb-safe space-y-8 scrollbar-hide stable-scroll-container">
        <div className="pb-20 max-w-2xl mx-auto">
          {chapter.chunks.map((chunk) => {
            const isActive = activeChunkId === chunk.id;
            const isMemorised = state.cards[chapterId]?.[chunk.id]?.isMemorised;
            const showAsMemorised = isMemorised && state.settings.showMemorised;
            const visibilityMode = state.settings.visibilityMode || 0;

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
                  {visibilityMode !== 2 && (
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                      isActive ? "text-[var(--chunk-active)]" : showAsMemorised ? "text-[var(--chunk-memorised)]" : "text-[var(--theme-ui-subtext)]"
                    }`}>
                      Verse {chunk.verseRange}
                    </span>
                  )}
                </div>
                
                <div className={`chunk-text ${isActive ? "chunk-text-bold" : showAsMemorised ? "opacity-80" : "opacity-90"}`}
                  style={showAsMemorised ? { color: "var(--chunk-memorised)" } : { color: "var(--theme-text)" }}
                >
                  {chunk.verses.map((v, idx) => (
                    <div key={idx} className={v.type === "heading" ? "w-full text-center" : "inline"}>
                      {v.type === "heading" ? (
                        visibilityMode === 0 && (
                          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] my-4 block w-full"
                            style={{ color: showAsMemorised ? "var(--chunk-memorised-sub)" : "var(--theme-ui-subtext)" }}
                          >
                            {v.text}
                          </h3>
                        )
                      ) : (
                        <span className="inline-block mr-2">
                          {visibilityMode !== 2 && (
                            <span className="text-[12px] align-top opacity-50 mr-1 italic font-normal"
                              style={showAsMemorised ? { color: "var(--chunk-memorised-sub)" } : undefined}
                            >
                              {v.number}
                            </span>
                          )}
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
                                    onTouchStart={(e) => {
                                      // Don't stopPropagation here to allow chunk long-press
                                      wordTouchStartTime.current = Date.now();
                                    }}
                                    onTouchEnd={(e) => {
                                      const duration = Date.now() - wordTouchStartTime.current;
                                      // If the long press timer already fired, don't highlight
                                      if (isLongPressTriggered.current) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        isLongPressTriggered.current = false; // Reset for next touch
                                        return;
                                      }

                                      if (duration < 500) {
                                        e.preventDefault(); // Prevent ghost click
                                        e.stopPropagation();
                                        
                                        // Also cancel the parent's long press timer since this was a tap
                                        if (longPressTimer.current) {
                                          clearTimeout(longPressTimer.current);
                                          longPressTimer.current = null;
                                        }
                                        
                                        toggleWordHighlight(part);
                                      }
                                    }}
                                    onClick={(e) => {
                                      // Fallback for mouse users
                                      if (isLongPressActive.current) {
                                        isLongPressActive.current = false;
                                        return;
                                      }
                                      // If touch events already handled it, e.detail will be 0 or handled
                                      if (e.detail !== 0) {
                                        toggleWordHighlight(part);
                                      }
                                    }}
                                    className={`cursor-pointer rounded-sm px-0.5 -mx-0.5 touch-manipulation ${
                                      isHighlighted 
                                        ? "text-[#FFCB1F] font-black" 
                                        : "hover:bg-white/5 transition-colors duration-300"
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
