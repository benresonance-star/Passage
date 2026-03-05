"use client";

import { useMemo } from "react";
import { hideWords, generateMnemonic } from "@/lib/cloze";
import { splitIntoLines } from "@/lib/parser";
import type { StudySection } from "@/types";

export type StudyStage = "read" | "soak" | "flow" | "recite" | "cloze" | "type" | "result";

interface TextAnchorProps {
  section: StudySection;
  stage: StudyStage;
  isDawn: boolean;
  soakHighlighted?: Set<number>;
  onSoakVerseToggle?: (scriptureIdx: number) => void;
  flowWordIndex?: number;
  flowFocusMode?: boolean;
  reciteRevealedVerses?: Set<number>;
  onReciteReveal?: (verseIdx: number) => void;
  clozeLevel?: 0 | 20 | 40 | 60 | 80 | "mnemonic";
}

export function TextAnchor({
  section,
  stage,
  isDawn,
  soakHighlighted,
  onSoakVerseToggle,
  flowWordIndex = -1,
  flowFocusMode = true,
  reciteRevealedVerses,
  onReciteReveal,
  clozeLevel = 20,
}: TextAnchorProps) {
  const scriptureVerses = useMemo(
    () => section.verses.filter(v => v.type === "scripture"),
    [section.verses]
  );

  const clozeText = useMemo(() => {
    if (stage !== "cloze") return "";
    const scriptureText = scriptureVerses.map(v => v.text).join("\n\n");
    if (clozeLevel === "mnemonic") return generateMnemonic(scriptureText);
    return hideWords(scriptureText, clozeLevel, section.id);
  }, [stage, clozeLevel, scriptureVerses, section.id]);

  if (stage === "cloze") {
    return (
      <div className="animate-in fade-in duration-500 px-6 md:px-12 my-auto max-w-2xl mx-auto w-full">
        <div className="chunk-text-bold text-center leading-relaxed whitespace-pre-wrap">
          {clozeText}
        </div>
      </div>
    );
  }

  // Read, Soak, Flow, and Recite all share the same verse layout to maintain text anchoring
  let globalWordIdx = 0;

  return (
    <div className={`px-6 md:px-12 my-auto max-w-2xl mx-auto w-full ${stage === "soak" ? "soak-breathe-text" : ""} ${stage === "recite" ? "py-8" : ""}`}>
      <div className={`chunk-text-bold text-center leading-relaxed ${stage === "recite" ? "space-y-4" : ""}`}>
        {section.verses.map((v, vIdx) => {
          if (v.type === "heading") {
            return (
              <span key={vIdx} className="block">
                <span
                  className="block text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-4 mt-2"
                  style={stage === "soak" ? {
                    opacity: 0.15,
                    transition: "opacity 0.8s ease-out",
                  } : undefined}
                >
                  {v.text}
                </span>
              </span>
            );
          }

          const scriptureIdx = scriptureVerses.indexOf(v);
          const isSoakFocused = stage === "soak" && soakHighlighted?.has(scriptureIdx);
          const isSoakDimmed = stage === "soak" && !soakHighlighted?.has(scriptureIdx);

          const isRecite = stage === "recite";
          const isRevealed = reciteRevealedVerses?.has(scriptureIdx);

          const words = v.text
            .replace(/\[LINEBREAK\]/g, " ")
            .split(/\s+/)
            .filter(w => w.length > 0);

          const verseEl = (
            <span
              key={vIdx}
              className={`transition-all duration-300 ${
                isRecite 
                  ? "block p-4 rounded-xl border text-left cursor-pointer" 
                  : "inline-block mb-4"
              } ${
                stage === "soak" ? "cursor-pointer" : ""
              } ${
                isRecite && isRevealed 
                  ? "bg-[var(--theme-ui-bg)] shadow-lg border-[var(--theme-ui-border)]" 
                  : isRecite 
                  ? "bg-[var(--theme-ui-bg)] text-transparent border-transparent opacity-40" 
                  : ""
              }`}
              onClick={() => {
                if (isRecite) onReciteReveal?.(scriptureIdx);
                else if (stage === "soak") onSoakVerseToggle?.(scriptureIdx);
              }}
              style={isRecite ? { touchAction: 'pan-y' } : undefined}
            >
              {words.map((word) => {
                const wi = globalWordIdx++;
                const isFlowRead = stage === "flow" && wi <= flowWordIndex;
                const isFlowUnread = stage === "flow" && wi > flowWordIndex;
                const isFlowHidden = isFlowUnread && flowFocusMode;

                return (
                  <span
                    key={wi}
                    className="inline"
                    style={{
                      transition: "color 0.8s ease-out, text-shadow 0.8s ease-out, opacity 0.8s ease-out",
                      ...(isSoakDimmed ? { opacity: 0.15 } : {}),
                      ...(isSoakFocused ? { opacity: 1 } : {}),
                      ...(isFlowHidden ? { opacity: 0 } : {}),
                      ...(isFlowRead
                        ? { color: "var(--flow-read)", textShadow: "var(--flow-glow, none)" }
                        : isFlowUnread
                        ? { color: "var(--flow-unread)", textShadow: "none" }
                        : {}),
                    }}
                  >
                    {word}{" "}
                  </span>
                );
              })}
            </span>
          );

          return verseEl;
        })}
      </div>
      {stage === "read" && (
        <div className="mt-6 text-center h-5">
          <p className={`text-sm italic ${isDawn ? "text-white/50" : "text-zinc-500"}`}>
            Attend to the text carefully.
          </p>
        </div>
      )}
      {stage === "soak" && (
        <div className="mt-6 text-center h-5">
          <p className={`text-sm italic ${isDawn ? "text-white/50" : "text-zinc-500"}`}>
            {scriptureVerses.length > 1
              ? `${soakHighlighted?.size || 0} of ${scriptureVerses.length} verses focused`
              : "Abide in this verse."}
          </p>
        </div>
      )}
      {stage === "flow" && (
        <div className="mt-6 text-center h-5">
          <p className={`text-sm italic animate-in fade-in duration-1000 ${isDawn ? "text-white/50" : "text-zinc-500"}`}>
            Breathe with the word.
          </p>
        </div>
      )}
      {stage === "recite" && (
        <div className="mt-6 text-center h-5">
          <p className={`text-sm italic ${isDawn ? "text-white/50" : "text-zinc-500"}`}>
            Reveal the text as you recite.
          </p>
        </div>
      )}
    </div>
  );
}
