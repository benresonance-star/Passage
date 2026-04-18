"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useBCM } from "@/context/BCMContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useWakeLock } from "@/hooks/useWakeLock";
import { getSections, splitIntoLines } from "@/lib/parser";
import { getWordDelay, DEFAULT_TUNING, type SpeechTuning } from "@/lib/speech";
import { calculateDiff, DiffResult } from "@/lib/diff";
import { updateCard, syncMemorisedState } from "@/lib/scheduler";
import { calculateUpdatedStreak } from "@/lib/streak";
import { TextAnchor, type StudyStage } from "@/components/study/TextAnchor";
import { StageControls } from "@/components/study/StageControls";
import { SpeechTuningOverlay } from "@/components/study/SpeechTuningOverlay";
import { EmptyState } from "@/components/EmptyState";
import { MinimalAudioPlayer } from "@/modules/audio/MinimalAudioPlayer";
import { isSongEntryMode, shouldRenderAbideAudioPlayer } from "./audioState";
import { CheckCircle2 } from "lucide-react";
import { Verse, StudySection } from "@/types";

export default function StudyPage() {
  const { state, setState, isHydrated, syncProgress } = useBCM();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRecallMode = searchParams.get("mode") === "recall";
  const isRecallAll = searchParams.get("recallAll") === "true";
  const requestedSongMode = searchParams.get("mode") === "song";
  useWakeLock();

  const [stage, setStage] = useState<StudyStage>("read");

  // If in recall mode, jump straight to Reveal stage and set ABC mode
  useEffect(() => {
    if (isRecallMode) {
      setStage("recite");
      setClozeLevel("mnemonic");
    }
  }, [isRecallMode]);

  // Flow state
  const [flowWordIndex, setFlowWordIndex] = useState(-1);
  const [flowPlaying, setFlowPlaying] = useState(false);
  const [flowWpm, setFlowWpm] = useState(230);
  const [flowFocusMode, setFlowFocusMode] = useState(true);
  const [speechTuning, setSpeechTuning] = useState<SpeechTuning>(DEFAULT_TUNING);
  const flowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Soak state — set of highlighted scripture-verse indices (toggle on tap)
  const [soakHighlighted, setSoakHighlighted] = useState<Set<number>>(new Set([0]));
  const [songTextDimmed, setSongTextDimmed] = useState(false);

  // Recite state
  const [reciteRevealed, setReciteRevealed] = useState<Set<number>>(new Set());

  // Cloze state
  const [clozeLevel, setClozeLevel] = useState<0 | 20 | 40 | 60 | 80 | "mnemonic">("mnemonic");

  // Speak state
  const [typedText, setTypedText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Result state
  const [diffResults, setDiffResults] = useState<{ results: DiffResult[]; accuracy: number } | null>(null);

  // Resolve active section
  const chapterId = state.selectedChapterId;
  const chapter = chapterId ? state.chapters[chapterId] : null;
  const studyUnit = state.settings.studyUnit || "chunk";
  const sections = useMemo(
    () => (chapter ? getSections(chapter, studyUnit) : []),
    [chapter, studyUnit]
  );
  const activeId = chapterId ? state.settings.activeChunkId[chapterId] : null;
  const activeSection = useMemo((): StudySection | null => {
    const baseSection = sections.find(s => s.id === activeId);
    if (!isRecallAll || !chapterId || !chapter) return baseSection || null;

    // Combined section for Recall All mode
    const memorisedSections = sections.filter(s => state.cards[chapterId]?.[s.id]?.isMemorised);
    if (memorisedSections.length === 0) return baseSection || null;

    return {
      id: `recall-all-${chapterId}`,
      verseRange: `${memorisedSections[0].verseRange.split('-')[0]}-${memorisedSections[memorisedSections.length - 1].verseRange.split('-').pop()}`,
      verses: memorisedSections.flatMap(s => s.verses),
      text: memorisedSections.map(s => s.text).join(" "),
      scriptureVerses: memorisedSections.flatMap(s => s.verses.filter(v => v.type === "scripture")),
    } as any;
  }, [sections, activeId, isRecallAll, chapterId, chapter, state.cards]);

  const words = useMemo(
    () => activeSection?.text.split(/\s+/).filter(w => w.length > 0) || [],
    [activeSection?.text]
  );

  const currentTheme = state.settings.theme || { bg: "#000000", text: "#f4f4f5" };
  const isDawn = currentTheme.id === "dawn";

  const scriptureVerses = useMemo(
    () => (activeSection as any)?.scriptureVerses || activeSection?.verses.filter(v => v.type === "scripture") || [],
    [activeSection]
  );
  const songTracks = state.defaultBackingTracks;
  const isSongMode = isSongEntryMode(requestedSongMode, songTracks);
  const shouldShowAbideAudioPlayer = shouldRenderAbideAudioPlayer(stage, songTracks);
  const selectedStudyTrackId = state.settings.activeStudyTrackId ?? null;
  const allScriptureVerseIndexes = useMemo(
    () => new Set(Array.from({ length: scriptureVerses.length }, (_, index) => index)),
    [scriptureVerses.length],
  );

  useEffect(() => {
    if (requestedSongMode && !isRecallMode) {
      setStage("soak");
      setSongTextDimmed(false);
      setSoakHighlighted(allScriptureVerseIndexes);
    }
  }, [requestedSongMode, isRecallMode, allScriptureVerseIndexes]);

  // Redirect if no chapter/section
  useEffect(() => {
    if (isHydrated && (!chapter || !chapterId)) {
      router.push("/chapter");
      return;
    }
    if (isHydrated && !activeSection && chapter) {
      const firstSection = sections[0];
      if (firstSection) {
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            activeChunkId: { ...prev.settings.activeChunkId, [chapterId!]: firstSection.id }
          }
        }));
      } else {
        router.push("/chapter");
      }
    }
  }, [isHydrated, chapter, chapterId, activeSection, sections, router, setState]);

  // Auto-grow textarea
  useEffect(() => {
    if (stage === "type" && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      const maxH = window.innerHeight - 320;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxH)}px`;
    }
  }, [typedText, stage]);

  // Flow timer
  useEffect(() => {
    if (stage === "flow" && flowPlaying && flowWordIndex < words.length - 1) {
      // Calculate delay based on the word that was JUST revealed (or a base delay if starting)
      const referenceWord = flowWordIndex >= 0 ? words[flowWordIndex] : "";
      const delay = referenceWord 
        ? getWordDelay(referenceWord, flowWpm, speechTuning, flowWordIndex, words) 
        : (60 / flowWpm) * 1000;
      
      flowTimerRef.current = setTimeout(() => {
        setFlowWordIndex(prev => prev + 1);
      }, delay);
    } else if (flowWordIndex >= words.length - 1) {
      setFlowPlaying(false);
    }
    return () => {
      if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
    };
  }, [stage, flowPlaying, flowWordIndex, words, flowWpm, speechTuning]);

  // Ensure SM2 card exists for the active section
  useEffect(() => {
    if (!isHydrated || !chapterId || !activeSection) return;
    const existing = state.cards[chapterId]?.[activeSection.id];
    if (!existing) {
      setState(prev => ({
        ...prev,
        cards: {
          ...prev.cards,
          [chapterId]: {
            ...(prev.cards[chapterId] || {}),
            [activeSection.id]: {
              id: activeSection.id,
              ease: 2.5,
              intervalDays: 0,
              reps: 0,
              lapses: 0,
              nextDueAt: new Date().toISOString(),
              lastScore: null,
              hardUntilAt: null,
              isMemorised: false,
            }
          }
        }
      }));
    }
  }, [isHydrated, chapterId, activeSection, state.cards, setState]);

  const handleGrade = useCallback(async (score: number) => {
    if (!chapterId || !activeSection || !chapter) return;
    const currentCard = state.cards[chapterId]?.[activeSection.id];
    if (!currentCard) return;

    const updatedCard = updateCard(currentCard, score);

    setState(prev => {
      const stats = prev.stats[chapterId] || { streak: 0, lastActivity: null };
      const newStreak = calculateUpdatedStreak(stats.streak, stats.lastActivity);
      
      const updatedCards = syncMemorisedState(
        prev.cards[chapterId],
        chapter,
        activeSection.id,
        updatedCard.isMemorised
      );
      
      // Ensure the updated card from SM-2 is preserved in the sync
      updatedCards[activeSection.id] = updatedCard;

      return {
        ...prev,
        cards: {
          ...prev.cards,
          [chapterId]: updatedCards
        },
        stats: {
          ...prev.stats,
          [chapterId]: { streak: newStreak, lastActivity: new Date().toISOString() }
        }
      };
    });

    if (user && chapter) {
      // Sync all affected cards
      const currentCards = state.cards[chapterId];
      const nextCards = syncMemorisedState(currentCards, chapter, activeSection.id, updatedCard.isMemorised);
      nextCards[activeSection.id] = updatedCard;

      const syncs = Object.entries(nextCards)
        .filter(([id, card]) => currentCards[id]?.isMemorised !== card.isMemorised)
        .map(([id, card]) => syncProgress(chapter.title, id, card));
      await Promise.all(syncs);
    }
  }, [chapterId, activeSection, chapter, state.cards, setState, user, syncProgress]);

  const handleStageChange = useCallback((newStage: StudyStage) => {
    // Reset stage-specific state when transitioning
    if (newStage === "soak") {
      setSoakHighlighted(
        isSongMode
          ? allScriptureVerseIndexes
          : new Set([0]),
      );
      setSongTextDimmed(false);
    }
    if (newStage === "flow") { setFlowWordIndex(-1); setFlowPlaying(false); }
    if (newStage === "recite") setReciteRevealed(new Set());
    if (newStage === "cloze") setClozeLevel("mnemonic");
    if (newStage === "type") setTypedText("");
    setStage(newStage);
  }, [allScriptureVerseIndexes, isSongMode]);

  const handleSpeakSubmit = useCallback(async () => {
    if (!activeSection) return;
    const results = calculateDiff(activeSection.text, typedText);
    setDiffResults(results);
    setStage("result");
    await handleGrade(results.accuracy / 100);
  }, [activeSection, typedText, handleGrade]);

  const reciteLines = useMemo(() => {
    const text = scriptureVerses.map((v: Verse) => v.text).join(" ");
    return text ? splitIntoLines(text) : [];
  }, [scriptureVerses]);

  const reciteAllRevealed = useMemo(() => {
    if (stage !== "recite") return false;
    return reciteRevealed.size > 0 && reciteRevealed.size >= reciteLines.length;
  }, [stage, reciteRevealed, reciteLines.length]);

  const handleContinue = useCallback(() => {
    if (isRecallMode && !isRecallAll && chapterId) {
      // Find all memorised sections
      const memorisedSections = Object.values(state.cards[chapterId] || {})
        .filter(c => c.isMemorised)
        .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
      
      const currentIndex = memorisedSections.findIndex(s => s.id === activeId);
      const nextRecall = memorisedSections[currentIndex + 1];

      if (nextRecall) {
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            activeChunkId: { ...prev.settings.activeChunkId, [chapterId]: nextRecall.id }
          }
        }));
        setStage("recite"); // Jump to Reveal for next section too
        setTypedText("");
        setDiffResults(null);
        return;
      }
    }
    router.push("/chapter");
  }, [isRecallMode, isRecallAll, chapterId, activeId, state.cards, router, setState]);

  if (!isHydrated) return null;
  if (!chapter || !chapterId || !activeSection) return <EmptyState />;

  const STAGE_TITLES: Record<StudyStage, string> = {
    read: "Attend",
    soak: "Abide",
    flow: "Breathe",
    recite: "Reveal",
    cloze: "Recollect",
    type: "Speak",
    result: "Results"
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-inherit pt-safe">
      {/* Breathing background for soak stage */}
      {stage === "soak" && (
        <div
          className="soak-breathe pointer-events-none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        />
      )}

      {/* Speech Tuning Overlay (Temporary) */}
      {stage === "flow" && (
        <SpeechTuningOverlay
          tuning={speechTuning}
          onTuningChange={setSpeechTuning}
          isDawn={isDawn}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 pb-2 pt-2 flex-shrink-0 z-10 relative">
        <div className="w-10" />
        <div className="text-center absolute left-1/2 -translate-x-1/2">
          <h1 className={`text-sm font-bold uppercase tracking-widest ${isDawn ? "text-white" : "text-orange-500"}`}>
            {STAGE_TITLES[stage]}
          </h1>
          <p className="text-[10px] text-[var(--theme-ui-subtext)] uppercase tracking-tight">
            {studyUnit === "verse" ? "Verse" : "Verses"} {activeSection.verseRange} · {chapter.bookName} {chapter.title}
          </p>
        </div>
        <div className="w-10" />
      </header>

      {/* Main content area — text stays anchored here */}
      <div className={`flex-1 overflow-y-auto scrollbar-hide stable-scroll-container flex flex-col relative z-10 ${stage === "type" ? "justify-start pt-8" : ""}`}>
        {stage === "type" ? (
          <div className="space-y-6 animate-in fade-in duration-500 px-6 md:px-12 max-w-2xl mx-auto w-full">
            <textarea
              ref={textareaRef}
              autoFocus
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full min-h-[16rem] bg-[var(--theme-ui-bg)] border border-[var(--theme-ui-border)] rounded-2xl p-6 chunk-text-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none overflow-y-auto scrollbar-hide"
              placeholder="Speak from memory..."
              style={{ color: "var(--theme-text)" }}
            />
          </div>
        ) : stage === "result" && diffResults ? (
          <div className="space-y-8 animate-in zoom-in-95 duration-300 px-6 md:px-12 my-auto max-w-2xl mx-auto w-full">
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
                      className={
                        res.status === "correct"
                          ? isDawn ? "text-[#FFCB1F]" : "text-white"
                          : res.status === "missing"
                          ? isDawn ? "text-white/50" : "text-orange-500/50"
                          : ""
                      }
                    >
                      {res.word}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <TextAnchor
            section={activeSection}
            stage={stage}
            isDawn={isDawn}
            songMode={isSongMode}
            songTextDimmed={songTextDimmed}
            soakHighlighted={soakHighlighted}
            onSoakVerseToggle={(idx) => {
              if (isSongMode) {
                return;
              }
              setSoakHighlighted(prev => {
                const next = new Set(prev);
                if (next.has(idx)) next.delete(idx); else next.add(idx);
                return next;
              });
            }}
            flowWordIndex={flowWordIndex}
            flowFocusMode={flowFocusMode}
            reciteRevealedVerses={reciteRevealed}
            onReciteReveal={(idx) => {
              setReciteRevealed(prev => {
                const next = new Set(prev);
                if (next.has(idx)) next.delete(idx); else next.add(idx);
                return next;
              });
            }}
            clozeLevel={clozeLevel}
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-30">
        {shouldShowAbideAudioPlayer ? (
          <div className="px-4 pb-2">
            <div className="max-w-2xl mx-auto flex justify-center">
              <MinimalAudioPlayer
                tracks={songTracks}
                selectedTrackId={selectedStudyTrackId}
                onTrackChange={(track) => {
                  setState((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      activeStudyTrackId: track.id,
                    },
                  }));
                }}
              />
            </div>
          </div>
        ) : null}
        <StageControls
          stage={stage}
          isDawn={isDawn}
          onStageChange={handleStageChange}
          onExit={() => router.push("/chapter")}
          songMode={isSongMode}
          songTextDimmed={songTextDimmed}
          onSongTextDimToggle={() => setSongTextDimmed((prev) => !prev)}
          flowPlaying={flowPlaying}
          onFlowToggle={() => {
            if (!flowPlaying && flowWordIndex < 0) setFlowWordIndex(0);
            setFlowPlaying(!flowPlaying);
          }}
          flowWpm={flowWpm}
          onFlowWpmChange={setFlowWpm}
          onFlowSkip={(dir) =>
            setFlowWordIndex(prev =>
              dir === "forward" ? Math.min(words.length - 1, prev + 1) : Math.max(-1, prev - 1)
            )
          }
          onFlowReset={() => { setFlowPlaying(false); setFlowWordIndex(-1); }}
          flowFocusMode={flowFocusMode}
          onFlowFocusToggle={() => setFlowFocusMode(!flowFocusMode)}
          clozeLevel={clozeLevel}
          onClozeLevelChange={setClozeLevel}
          reciteAllRevealed={reciteAllRevealed}
          onReciteRevealToggle={() => {
            if (reciteAllRevealed) {
              setReciteRevealed(new Set());
            } else {
              setReciteRevealed(new Set(Array.from({ length: scriptureVerses.length }, (_, i) => i)));
            }
          }}
          onTypeSubmit={handleSpeakSubmit}
          canSubmit={typedText.trim().length > 0}
          onTryAgain={() => { setTypedText(""); handleStageChange("type"); }}
          onContinue={handleContinue}
          accuracy={diffResults?.accuracy}
        />
      </div>
    </div>
  );
}
