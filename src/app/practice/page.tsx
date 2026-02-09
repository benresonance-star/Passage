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
import FlowControls from "@/components/FlowControls";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Zap, EyeOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

type PracticeMode = "read" | "cloze" | "type" | "result";

export default function PracticePage() {
  const { state, setState, isHydrated, syncProgress } = useBCM();
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<PracticeMode>("read");
  const [isFlowMode, setIsFlowMode] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [diffResults, setDiffResults] = useState<{ results: DiffResult[]; accuracy: number } | null>(null);

  // Flow State
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(150);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useWakeLock();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const activeChunkId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  const activeChunk = chapter?.chunks.find(c => c.id === activeChunkId);
  const words = activeChunk?.text.split(/\s+/).filter(w => w.length > 0) || [];
  
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

  const handleNextMode = async () => {
    if (mode === "read") setMode("cloze");
    else if (mode === "cloze") setMode("type");
    else if (mode === "type") {
      if (!activeChunk) return;
      const results = calculateDiff(activeChunk.text, typedText);
      setDiffResults(results);
      setMode("result");

      const currentCard = state.cards[chapterId]?.[activeChunk.id];
      if (currentCard) {
        const score = results.accuracy / 100;
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
    else if (mode === "type") setMode("cloze");
    else if (mode === "result") setMode("type");
    else router.push("/chapter");
  };


  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] relative">
      <header className="flex items-center justify-between py-4">
        <button onClick={handleBack} className="text-zinc-500 p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold uppercase tracking-widest text-orange-500">
            {mode === "read" ? "Read Mode" : mode === "cloze" ? "Cloze Mode" : mode === "type" ? "Recall Mode" : "Results"}
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-tight">
            Verses {activeChunk?.verseRange} • {chapter?.title}
          </p>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col justify-center">
        {mode === "read" && activeChunk && (
          <div className="animate-in fade-in duration-500">
            <div className="space-y-6">
              <div className="chunk-text-bold text-center leading-relaxed px-4">
                {(() => {
                  // Single-layer rendering: each word is individually colored
                  // based on flow progress — no overlay, no alignment drift.
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
              
              <p className={`text-center transition-opacity duration-500 text-sm italic ${
                isDawn ? "text-white" : "text-zinc-500"
              } ${isFlowMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                Read the text carefully.
              </p>
            </div>
          </div>
        )}

        {mode === "cloze" && activeChunk && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="chunk-text-bold text-center leading-relaxed px-4">
              {state.settings.clozeLevel === "mnemonic" 
                ? generateMnemonic(activeChunk.text)
                : hideWords(activeChunk.text, state.settings.clozeLevel as number, activeChunk.id)}
            </div>
            <div className="flex justify-center gap-2 flex-wrap px-4">
              {([0, 20, 40, 60, 80] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setState(p => ({ ...p, settings: { ...p.settings, clozeLevel: level } }))}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    state.settings.clozeLevel === level 
                      ? "bg-orange-500 text-white" 
                      : "bg-[var(--surface)] text-[var(--theme-ui-subtext)] border border-[var(--surface-border)]"
                  }`}
                >
                  {level}%
                </button>
              ))}
              <button
                onClick={() => setState(p => ({ ...p, settings: { ...p.settings, clozeLevel: "mnemonic" } }))}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors uppercase tracking-widest ${
                  state.settings.clozeLevel === "mnemonic" 
                    ? "bg-amber-500 text-black" 
                    : "bg-[var(--surface)] text-[var(--theme-ui-subtext)] border border-[var(--surface-border)]"
                }`}
              >
                Abc
              </button>
            </div>
          </div>
        )}

        {mode === "type" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <textarea
              autoFocus
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full h-64 bg-[var(--theme-ui-bg)] border border-[var(--theme-ui-border)] rounded-2xl p-6 text-xl leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none color-inherit"
              placeholder="Type from memory..."
              style={{ color: 'inherit' }}
            />
          </div>
        )}

        {mode === "result" && diffResults && (
          <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="bg-[var(--theme-ui-bg)] border border-[var(--theme-ui-border)] rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <span className="text-2xl font-bold">{diffResults.accuracy}%</span>
                </div>
                <div className="text-[var(--theme-ui-subtext)] text-sm">Accuracy</div>
              </div>

              <div className="flex flex-wrap gap-x-2 gap-y-1 text-lg leading-relaxed">
                {diffResults.results
                  .filter(res => res.status !== "extra")
                  .map((res, i) => (
                    <span
                      key={i}
                      className={`${
                        res.status === "correct" 
                          ? (isDawn ? "text-[#FFCB1F] font-bold" : "text-white") 
                          : res.status === "missing" 
                          ? (isDawn ? "text-white opacity-50 italic" : "text-orange-500/50 italic")
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
                setMode("read");
              }}
              className="w-full py-4 bg-[var(--theme-ui-bg)] font-bold rounded-2xl flex items-center justify-center gap-2 border border-[var(--theme-ui-border)]"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="py-8 space-y-4">
        {mode === "read" && (
          <div className="relative">
            {!isFlowMode ? (
              <button
                onClick={() => setIsFlowMode(true)}
                className="w-full py-4 bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-ui-subtext)] font-bold rounded-2xl flex items-center justify-center gap-2 hover:text-orange-500 transition-all uppercase tracking-widest text-xs"
              >
                <Zap size={16} className="fill-current" />
                Flow Mode
              </button>
            ) : (
              <FlowControls 
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                wpm={wpm}
                onWpmChange={setWpm}
                onSkip={(dir) => setCurrentIndex(prev => dir === 'forward' ? Math.min(words.length - 1, prev + 5) : Math.max(-1, prev - 5))}
                onClose={() => {
                  setIsFlowMode(false);
                  setIsPlaying(false);
                  setCurrentIndex(-1);
                }}
              />
            )}
          </div>
        )}

        {mode !== "result" && (
          <button
            onClick={handleNextMode}
            className={`w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
              isDawn 
                ? "bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-ui-subtext)] hover:text-orange-500 uppercase tracking-widest text-xs" 
                : "bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-95"
            }`}
          >
            {isDawn && mode === "read" && <EyeOff size={16} className="fill-current" />}
            {mode === "read" ? "Cloze Mode" : mode === "cloze" ? "Type It" : "Submit"}
          </button>
        )}
        
        {mode === "result" && (
          <button
            onClick={() => router.push("/chapter")}
            className={`w-full py-4 font-bold rounded-2xl transition-all ${
              isDawn
                ? "bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-ui-subtext)] hover:text-orange-500 uppercase tracking-widest text-xs"
                : "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
            }`}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
