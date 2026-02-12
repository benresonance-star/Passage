"use client";

import { useState, useEffect, useRef } from "react";
import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { hideWords, generateMnemonic } from "@/lib/cloze";
import { calculateDiff, DiffResult } from "@/lib/diff";
import { updateCard } from "@/lib/scheduler";
import { calculateUpdatedStreak } from "@/lib/streak";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAuth } from "@/context/AuthContext";
import { splitIntoLines } from "@/lib/parser";
import FlowControls from "@/components/FlowControls";
import { ArrowLeft, RefreshCw, CheckCircle2, Zap, EyeOff, Eye, Mic } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

type PracticeMode = "read" | "cloze" | "type" | "result" | "recite";

export default function PracticePage() {
  const { state, setState, isHydrated, syncProgress } = useBCM();
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<PracticeMode>("read");
  const [isFlowMode, setIsFlowMode] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [diffResults, setDiffResults] = useState<{ results: DiffResult[]; accuracy: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Recite State
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [isGraded, setIsGraded] = useState(false);

  // Auto-grow textarea
  useEffect(() => {
    if (mode === "type" && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      // Calculate max height: viewport height minus top space, bottom nav, and footer
      const maxH = window.innerHeight - 320; 
      const newHeight = Math.min(textarea.scrollHeight, maxH);
      textarea.style.height = `${newHeight}px`;
    }
  }, [typedText, mode]);

  // Flow State
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useWakeLock();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const activeChunkId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  const activeChunk = chapter?.chunks.find(c => c.id === activeChunkId);
  const words = activeChunk?.text.split(/\s+/).filter(w => w.length > 0) || [];
  
  const scriptureText = activeChunk?.verses
    .filter(v => v.type === "scripture")
    .map(v => v.text)
    .join(" ") || "";
  const lines = scriptureText ? splitIntoLines(scriptureText) : [];
  const isAllRevealed = revealedLines.size === lines.length && lines.length > 0;

  const currentTheme = state.settings.theme || { bg: "#000000", text: "#f4f4f5" };
  const isDawn = currentTheme.id === "dawn";

  useEffect(() => {
    const handleReset = () => {
      setMode("read");
      setIsFlowMode(false);
      setTypedText("");
      setDiffResults(null);
      setCurrentIndex(-1);
      setIsPlaying(false);
      setRevealedLines(new Set());
      setIsGraded(false);
    };

    window.addEventListener("bcm-reset-practice", handleReset);
    return () => window.removeEventListener("bcm-reset-practice", handleReset);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (!chapter || !chapterId) {
        router.push("/chapter");
        return;
      }

      if (!activeChunkId) {
        const firstUnmemorised = chapter.chunks.find(c => !state.cards[chapterId]?.[c.id]?.isMemorised);
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
          router.push("/chapter");
        }
      }
    }
  }, [isHydrated, chapter, chapterId, activeChunkId, state.cards, router, setState]);

  // Flow Logic
  useEffect(() => {
    if (isFlowMode && isPlaying && currentIndex < words.length - 1) {
      const msPerWord = (60 / wpm) * 1000;
      timerRef.current = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, msPerWord);
    } else if (currentIndex >= words.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFlowMode, isPlaying, currentIndex, words.length, wpm]);

  if (!isHydrated) return null;
  if (!chapter || !chapterId || !activeChunk) return <EmptyState />;

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

      if (user && chapter) {
        await syncProgress(chapter.title, activeChunk.id, updatedCard);
      }
    }
  };

  const handleNextMode = async () => {
    if (mode === "read") setMode("cloze");
    else if (mode === "cloze") setMode("type");
    else if (mode === "type") {
      if (!activeChunk) return;
      const results = calculateDiff(activeChunk.text, typedText);
      setDiffResults(results);
      setMode("result");
      await handleGrade(results.accuracy / 100);
    }
  };

  const handleBack = () => {
    if (isFlowMode) {
      setIsFlowMode(false);
      setIsPlaying(false);
      setCurrentIndex(-1);
      return;
    }
    if (mode === "cloze") setMode("read");
    else if (mode === "recite") setMode("read");
    else if (mode === "type") setMode("cloze");
    else if (mode === "result") setMode("type");
    else router.push("/chapter");
  };

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

  return (
    <div className="flex flex-col h-[calc(100dvh-64px-env(safe-area-inset-bottom))] max-w-2xl mx-auto relative pt-safe">
      <header className="flex items-center justify-between pb-4 px-4 flex-shrink-0">
        <button onClick={handleBack} className="text-zinc-500 p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold uppercase tracking-widest text-orange-500">
            {isFlowMode ? "Flow Mode" : mode === "read" ? "Read Mode" : mode === "cloze" ? "Cloze Mode" : mode === "type" ? "Recall Mode" : mode === "recite" ? "Recite Mode" : "Results"}
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-tight">
            Verses {activeChunk?.verseRange} • {chapter?.title}
          </p>
        </div>
        {mode === "recite" ? (
          <button onClick={handleRevealToggle} className="text-zinc-500 p-2 -mr-2">
            {isAllRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      <div className={`flex-1 overflow-y-auto scrollbar-hide flex flex-col ${mode === "type" ? "justify-start pt-12" : "justify-center"}`}>
        {mode === "read" && activeChunk && (
          <div className="animate-in fade-in duration-500 px-4">
            <div className="space-y-6">
              <div className="chunk-text-bold text-center leading-relaxed px-4">
                {(() => {
                  let globalWordIdx = 0;
                  return activeChunk.verses.map((v, idx) => (
                    <span key={idx} className={v.type === "heading" ? "block" : "inline"}>
                      {v.type === "heading" ? (
                        state.settings.showHeadings && (
                          <span className="block text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-4 mt-2">
                            {v.text}
                          </span>
                        )
                      ) : (
                        <>
                          {v.text.split(/\s+/).filter(w => w.length > 0).map((word) => {
                            const wi = globalWordIdx++;
                            const isRead = isFlowMode && wi <= currentIndex;
                            const isUnread = isFlowMode && wi > currentIndex;
                            return (
                              <span
                                key={wi}
                                className="inline"
                                style={{
                                  transition: "color 0.8s ease-out, text-shadow 0.8s ease-out",
                                  ...(isRead
                                    ? { color: "var(--flow-read)", textShadow: "var(--flow-glow, none)" }
                                    : isUnread
                                    ? { color: "var(--flow-unread)", textShadow: "none" }
                                    : {}),
                                }}
                              >
                                {word}{" "}
                              </span>
                            );
                          })}
                        </>
                      )}
                    </span>
                  ));
                })()}
              </div>
              <div className="relative h-6">
                <p className={`absolute inset-0 text-center transition-opacity duration-500 text-sm italic ${
                  isDawn ? "text-white" : "text-zinc-500"
                } ${isFlowMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  Read the text carefully.
                </p>
                {isFlowMode && (
                  <p className={`absolute inset-0 text-center animate-in fade-in duration-1000 text-sm italic ${
                    isDawn ? "text-white" : "text-zinc-500"
                  }`}>
                    Read the text slowly and deeply.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "recite" && (
          <div className="space-y-4 py-8 px-4 animate-in fade-in duration-500">
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
                  <p className="text-lg leading-relaxed select-none">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "cloze" && activeChunk && (
          <div className="animate-in fade-in duration-500 px-4">
            <div className="chunk-text-bold text-center leading-relaxed px-4">
              {state.settings.clozeLevel === "mnemonic" 
                ? generateMnemonic(activeChunk.text)
                : hideWords(activeChunk.text, state.settings.clozeLevel as number, activeChunk.id)}
            </div>
          </div>
        )}

        {mode === "type" && (
          <div className="space-y-6 animate-in fade-in duration-500 px-4">
            <textarea
              ref={textareaRef}
              autoFocus
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full min-h-[16rem] bg-[var(--theme-ui-bg)] border border-[var(--theme-ui-border)] rounded-2xl p-6 chunk-text-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none overflow-y-auto scrollbar-hide"
              placeholder="Type from memory..."
              style={{ color: 'var(--theme-text)' }}
            />
          </div>
        )}

        {mode === "result" && diffResults && (
          <div className="space-y-8 animate-in zoom-in-95 duration-300 px-4">
            <div className="bg-[var(--theme-ui-bg)] border border-[var(--theme-ui-border)] rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <span className="text-2xl font-bold">{diffResults.accuracy}%</span>
                </div>
                <div className="text-[var(--theme-ui-subtext)] text-sm">Accuracy</div>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 chunk-text-bold leading-relaxed">
                {diffResults.results
                  .filter(res => res.status !== "extra")
                  .map((res, i) => (
                    <span
                      key={i}
                      className={`${
                        res.status === "correct" 
                          ? (isDawn ? "text-[#FFCB1F]" : "text-white") 
                          : res.status === "missing" 
                          ? (isDawn ? "text-white/50" : "text-orange-500/50")
                          : ""
                      }`}
                    >
                      {res.word}
                    </span>
                  ))}
              </div>
            </div>
            <button
              onClick={() => {
                setTypedText("");
                setMode("type");
              }}
              className="w-full py-4 bg-[var(--theme-ui-bg)] font-bold rounded-2xl flex items-center justify-center gap-2 border border-[var(--theme-ui-border)]"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="py-8 space-y-4 px-4 flex-shrink-0">
        {mode === "read" && !isFlowMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsFlowMode(true)}
              className={`flex-1 py-4 font-bold rounded-2xl flex flex-col items-center justify-center gap-1 transition-all uppercase tracking-widest bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-text)] hover:text-orange-500 ${
                isDawn ? "text-[13px]" : "text-[11px]"
              }`}
            >
              <Zap size={16} className="fill-current" />
              FLOW
            </button>
            <button
              onClick={() => setMode("recite")}
              className={`flex-1 py-4 font-bold rounded-2xl flex flex-col items-center justify-center gap-1 transition-all uppercase tracking-widest bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-text)] hover:text-orange-500 ${
                isDawn ? "text-[13px]" : "text-[11px]"
              }`}
            >
              <Mic size={16} />
              RECITE
            </button>
            <button
              onClick={handleNextMode}
              className={`flex-1 py-4 font-bold rounded-2xl transition-all flex flex-col items-center justify-center gap-1 uppercase tracking-widest bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-text)] hover:text-orange-500 ${
                isDawn ? "text-[13px]" : "text-[11px]"
              }`}
            >
              <EyeOff size={16} className="fill-current" />
              CLOZE
            </button>
          </div>
        ) : (
          <>
            {mode === "cloze" && (
              <div className="flex justify-between gap-2 mb-2 animate-in slide-in-from-bottom-2 duration-500">
                {([0, 20, 40, 60, 80] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setState(p => ({ ...p, settings: { ...p.settings, clozeLevel: level } }))}
                    className={`flex-1 py-2 rounded-xl font-bold transition-all active:scale-95 ${
                      isDawn ? "text-[13px]" : "text-[11px]"
                    } ${
                      state.settings.clozeLevel === level 
                        ? (isDawn ? "bg-white text-black shadow-lg shadow-white/20" : "bg-orange-500 text-white shadow-lg shadow-orange-500/20")
                        : (isDawn ? "bg-white/10 text-white border border-white/20" : "bg-[var(--surface)] text-[var(--theme-ui-subtext)] border border-[var(--surface-border)]")
                    }`}
                  >
                    {level}%
                  </button>
                ))}
                <button
                  onClick={() => setState(p => ({ ...p, settings: { ...p.settings, clozeLevel: "mnemonic" } }))}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all active:scale-95 uppercase tracking-widest ${
                    isDawn ? "text-[13px]" : "text-[11px]"
                  } ${
                    state.settings.clozeLevel === "mnemonic" 
                      ? (isDawn ? "bg-[#FFCB1F] text-black shadow-lg shadow-[#FFCB1F]/20" : "bg-amber-500 text-black shadow-lg shadow-amber-500/20")
                      : (isDawn ? "bg-white/10 text-white border border-white/20" : "bg-[var(--surface)] text-[var(--theme-ui-subtext)] border border-[var(--surface-border)]")
                  }`}
                >
                  Abc
                </button>
              </div>
            )}

            {mode === "read" && isFlowMode && (
              <div className="relative">
                <FlowControls 
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  wpm={wpm}
                  onWpmChange={setWpm}
                  onSkip={(dir) => setCurrentIndex(prev => dir === 'forward' ? Math.min(words.length - 1, prev + 1) : Math.max(-1, prev - 1))}
                  onReset={() => {
                    setIsPlaying(false);
                    setCurrentIndex(-1);
                  }}
                  onClose={() => {
                    setIsFlowMode(false);
                    setIsPlaying(false);
                    setCurrentIndex(-1);
                  }}
                />
              </div>
            )}

            {mode !== "result" && mode !== "read" && (
              <button
                onClick={mode === "recite" ? async () => {
                  if (!isGraded) await handleGrade(0.75);
                  setMode("read");
                } : handleNextMode}
                className={`w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-text)] hover:text-orange-500 ${
                  isDawn ? "text-[13px]" : "text-[11px]"
                }`}
              >
                {mode === "cloze" ? "Type It" : mode === "recite" ? "Done" : "Submit"}
              </button>
            )}
            
            {mode === "result" && (
              <button
                onClick={() => router.push("/chapter")}
                className={`w-full py-4 font-bold rounded-2xl transition-all uppercase tracking-widest bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-text)] hover:text-orange-500 ${
                  isDawn ? "text-[13px]" : "text-[11px]"
                }`}
              >
                Continue
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
