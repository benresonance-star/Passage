"use client";

import { ChevronLeft, ChevronRight, X, Play, Pause, RotateCcw, SkipBack, SkipForward, Eye, EyeOff } from "lucide-react";
import type { StudyStage } from "./TextAnchor";

const STAGES: StudyStage[] = ["read", "soak", "flow", "recite", "cloze", "type", "result"];
const STAGE_LABELS: Record<StudyStage, string> = {
  read: "Attend",
  soak: "Abide",
  flow: "Breathe",
  recite: "Receive",
  cloze: "Recollect",
  type: "Speak",
  result: "Result",
};

interface StageControlsProps {
  stage: StudyStage;
  isDawn: boolean;
  onStageChange: (stage: StudyStage) => void;
  onExit: () => void;
  // Flow controls
  flowPlaying?: boolean;
  onFlowToggle?: () => void;
  flowWpm?: number;
  onFlowWpmChange?: (wpm: number) => void;
  onFlowSkip?: (dir: "forward" | "back") => void;
  onFlowReset?: () => void;
  flowFocusMode?: boolean;
  onFlowFocusToggle?: () => void;
  // Cloze controls
  clozeLevel?: 0 | 20 | 40 | 60 | 80 | "mnemonic";
  onClozeLevelChange?: (level: 0 | 20 | 40 | 60 | 80 | "mnemonic") => void;
  // Recite controls
  reciteAllRevealed?: boolean;
  onReciteRevealToggle?: () => void;
  // Type controls
  onTypeSubmit?: () => void;
  canSubmit?: boolean;
  // Result controls
  onTryAgain?: () => void;
  onContinue?: () => void;
  accuracy?: number;
}

export function StageControls({
  stage,
  isDawn,
  onStageChange,
  onExit,
  flowPlaying,
  onFlowToggle,
  flowWpm = 100,
  onFlowWpmChange,
  onFlowSkip,
  onFlowReset,
  flowFocusMode,
  onFlowFocusToggle,
  clozeLevel,
  onClozeLevelChange,
  reciteAllRevealed,
  onReciteRevealToggle,
  onTypeSubmit,
  canSubmit,
  onTryAgain,
  onContinue,
}: StageControlsProps) {
  const stageIdx = STAGES.indexOf(stage);
  const canGoBack = stageIdx > 0 && stage !== "result";
  const canGoForward = stageIdx < STAGES.length - 1 && stage !== "type" && stage !== "result";

  const goBack = () => {
    if (canGoBack) onStageChange(STAGES[stageIdx - 1]);
  };
  const goForward = () => {
    if (stage === "cloze") {
      onStageChange("type");
    } else if (canGoForward) {
      onStageChange(STAGES[stageIdx + 1]);
    }
  };

  return (
    <div className="flex-shrink-0 px-4 pb-8 pt-4 space-y-3">
      {/* Stage-specific controls */}
      {stage === "flow" && (
        <div className="flex items-center justify-center gap-3 animate-in fade-in duration-300">
          <button onClick={onFlowReset} className="p-2 text-[var(--theme-ui-subtext)]">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => onFlowSkip?.("back")} className="p-2 text-[var(--theme-ui-subtext)]">
            <SkipBack size={16} />
          </button>
          <button
            onClick={onFlowToggle}
            className={`p-3 rounded-full ${isDawn ? "bg-white/20 text-white" : "bg-orange-500 text-white"}`}
          >
            {flowPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button onClick={() => onFlowSkip?.("forward")} className="p-2 text-[var(--theme-ui-subtext)]">
            <SkipForward size={16} />
          </button>
          <button
            onClick={onFlowFocusToggle}
            className={`p-2 rounded-lg ${flowFocusMode ? (isDawn ? "text-white" : "text-orange-400") : "text-[var(--theme-ui-subtext)]"}`}
          >
            {flowFocusMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <div className="flex items-center gap-1 ml-2">
            <input
              type="range"
              min={40}
              max={300}
              value={flowWpm}
              onChange={(e) => onFlowWpmChange?.(Number(e.target.value))}
              className="w-16 h-1 accent-orange-500"
            />
            <span className="text-[10px] text-[var(--theme-ui-subtext)] w-8">{flowWpm}</span>
          </div>
        </div>
      )}

      {stage === "cloze" && (
        <div className="flex justify-between gap-2 animate-in slide-in-from-bottom-2 duration-500">
          {([0, 20, 40, 60, 80] as const).map((level) => (
            <button
              key={level}
              onClick={() => onClozeLevelChange?.(level)}
              className={`flex-1 py-2 rounded-xl font-bold transition-all active:scale-95 ${
                isDawn ? "text-[13px]" : "text-[11px]"
              } ${
                clozeLevel === level
                  ? isDawn ? "bg-white text-black shadow-lg shadow-white/20" : "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : isDawn ? "bg-white/10 text-white border border-white/20" : "bg-[var(--surface)] text-[var(--theme-ui-subtext)] border border-[var(--surface-border)]"
              }`}
            >
              {level}%
            </button>
          ))}
          <button
            onClick={() => onClozeLevelChange?.("mnemonic")}
            className={`flex-1 py-2 rounded-xl font-bold transition-all active:scale-95 uppercase tracking-widest ${
              isDawn ? "text-[13px]" : "text-[11px]"
            } ${
              clozeLevel === "mnemonic"
                ? isDawn ? "bg-[#FFCB1F] text-black shadow-lg" : "bg-amber-500 text-black shadow-lg"
                : isDawn ? "bg-white/10 text-white border border-white/20" : "bg-[var(--surface)] text-[var(--theme-ui-subtext)] border border-[var(--surface-border)]"
            }`}
          >
            Abc
          </button>
        </div>
      )}

      {stage === "recite" && (
        <div className="flex justify-center animate-in fade-in duration-300">
          <button onClick={onReciteRevealToggle} className="flex items-center gap-2 px-4 py-2 rounded-full text-[var(--theme-ui-subtext)] text-xs">
            {reciteAllRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
            {reciteAllRevealed ? "Hide All" : "Reveal All"}
          </button>
        </div>
      )}

      {stage === "type" && (
        <button
          onClick={onTypeSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 font-bold rounded-2xl transition-all uppercase tracking-widest ${
            isDawn ? "text-[13px]" : "text-[11px]"
          } ${
            canSubmit
              ? isDawn ? "bg-white/20 text-white border border-white/30" : "bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-text)]"
              : "opacity-40 bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-ui-subtext)]"
          }`}
        >
          Submit
        </button>
      )}

      {stage === "result" && (
        <div className="flex gap-2">
          <button
            onClick={onTryAgain}
            className={`flex-1 py-4 font-bold rounded-2xl transition-all uppercase tracking-widest bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--theme-text)] ${
              isDawn ? "text-[13px]" : "text-[11px]"
            }`}
          >
            Try Again
          </button>
          <button
            onClick={onContinue}
            className={`flex-1 py-4 font-bold rounded-2xl transition-all uppercase tracking-widest ${
              isDawn ? "text-[13px] bg-white/20 text-white border border-white/30" : "text-[11px] bg-orange-500 text-white shadow-lg shadow-orange-500/20"
            }`}
          >
            Done
          </button>
        </div>
      )}

      {/* Stage navigation bar */}
      <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="p-2 text-[var(--theme-ui-subtext)] hover:text-[var(--theme-text)] transition-colors"
            aria-label="Exit study session"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className={`p-1.5 rounded-full transition-all ${canGoBack ? "text-[var(--theme-text)]" : "text-[var(--theme-ui-subtext)] opacity-30"}`}
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {STAGES.slice(0, -1).map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    if (i <= stageIdx + 1) onStageChange(s);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    s === stage
                      ? `w-6 h-2 ${isDawn ? "bg-white" : "bg-orange-500"}`
                      : i < stageIdx
                      ? `w-2 h-2 ${isDawn ? "bg-white/40" : "bg-orange-500/40"}`
                      : "w-2 h-2 bg-[var(--theme-ui-subtext)] opacity-30"
                  }`}
                  aria-label={STAGE_LABELS[s]}
                />
              ))}
            </div>

            <button
              onClick={goForward}
              disabled={!canGoForward}
              className={`p-1.5 rounded-full transition-all ${canGoForward ? "text-[var(--theme-text)]" : "text-[var(--theme-ui-subtext)] opacity-30"}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className={`text-[9px] font-bold uppercase tracking-widest ${isDawn ? "text-white/50" : "text-zinc-500"}`}>
            {STAGE_LABELS[stage]}
          </div>
      </div>
    </div>
  );
}
