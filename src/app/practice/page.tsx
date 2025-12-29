"use client";

import { useState, useEffect } from "react";
import { useBCM } from "@/context/BCMContext";
import { useRouter } from "next/navigation";
import { hideWords, generateMnemonic } from "@/lib/cloze";
import { calculateDiff, DiffResult } from "@/lib/diff";
import { updateCard } from "@/lib/scheduler";
import { useWakeLock } from "@/hooks/useWakeLock";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

type PracticeMode = "read" | "cloze" | "type" | "result";

export default function PracticePage() {
  const { state, setState, isHydrated } = useBCM();
  const router = useRouter();
  const [mode, setMode] = useState<PracticeMode>("read");
  const [typedText, setTypedText] = useState("");
  const [diffResults, setDiffResults] = useState<{ results: DiffResult[]; accuracy: number } | null>(null);

  useWakeLock();

  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const activeChunkId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  const activeChunk = chapter?.chunks.find(c => c.id === activeChunkId);

  useEffect(() => {
    const handleReset = () => {
      setMode("read");
      setTypedText("");
      setDiffResults(null);
    };

    window.addEventListener("bcm-reset-practice", handleReset);
    return () => window.removeEventListener("bcm-reset-practice", handleReset);
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

  const handleNextMode = () => {
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
    }
  };

  const handleBack = () => {
    if (mode === "cloze") setMode("read");
    else if (mode === "type") setMode("cloze");
    else if (mode === "result") setMode("type");
    else router.push("/chapter");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
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

      <div className="flex-1 flex flex-col justify-center py-8">
        {mode === "read" && activeChunk && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="chunk-text-bold text-center leading-relaxed">
              {activeChunk.verses.map((v, idx) => (
                <div key={idx} className={v.type === "heading" ? "w-full" : "inline"}>
                  {v.type === "heading" ? (
                    state.settings.showHeadings && (
                      <div className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-4 mt-2">
                        {v.text}
                      </div>
                    )
                  ) : (
                    <span>{v.text} </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-zinc-500 text-sm italic">Read the text carefully.</p>
          </div>
        )}

        {mode === "cloze" && activeChunk && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <p className="chunk-text-bold text-center leading-relaxed font-mono tracking-tight">
              {state.settings.clozeLevel === "mnemonic" 
                ? generateMnemonic(activeChunk.text)
                : hideWords(activeChunk.text, state.settings.clozeLevel as number, activeChunk.id)}
            </p>
            <div className="flex justify-center gap-2 flex-wrap px-4">
              {[0, 20, 40, 60, 80].map((level) => (
                <button
                  key={level}
                  onClick={() => setState(p => ({ ...p, settings: { ...p.settings, clozeLevel: level as any } }))}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    state.settings.clozeLevel === level 
                      ? "bg-orange-500 text-white" 
                      : "bg-zinc-900 text-zinc-500 border border-zinc-800"
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
                    : "bg-zinc-900 text-zinc-500 border border-zinc-800"
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
              className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-xl leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              placeholder="Type from memory..."
            />
          </div>
        )}

        {mode === "result" && diffResults && (
          <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <span className="text-2xl font-bold">{diffResults.accuracy}%</span>
                </div>
                <div className="text-zinc-500 text-sm">Accuracy</div>
              </div>

              <div className="flex flex-wrap gap-x-2 gap-y-1 text-lg leading-relaxed">
                {diffResults.results.map((res, i) => (
                  <span
                    key={i}
                    className={`${
                      res.status === "correct" 
                        ? "text-zinc-200" 
                        : res.status === "wrong" 
                        ? "text-red-500 underline decoration-red-500/50 underline-offset-4" 
                        : res.status === "missing" 
                        ? "text-orange-500/50 italic"
                        : "text-red-400 opacity-50 line-through"
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
              className="w-full py-4 bg-zinc-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="py-8">
        {mode !== "result" && (
          <button
            onClick={handleNextMode}
            className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            {mode === "read" ? "Cloze Mode" : mode === "cloze" ? "Type It" : "Submit"}
          </button>
        )}
        
        {mode === "result" && (
          <button
            onClick={() => router.push("/chapter")}
            className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
