"use client";

import { useState } from "react";
import { SpeechTuning } from "@/lib/speech";
import { Settings2, X } from "lucide-react";

interface SpeechTuningOverlayProps {
  tuning: SpeechTuning;
  onTuningChange: (tuning: SpeechTuning) => void;
  isDawn: boolean;
}

export function SpeechTuningOverlay({ tuning, onTuningChange, isDawn }: SpeechTuningOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-50 p-3 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 shadow-xl"
      >
        <Settings2 size={20} />
      </button>
    );
  }

  const handleChange = (key: keyof SpeechTuning, value: number) => {
    onTuningChange({ ...tuning, [key]: value });
  };

  return (
    <div className="fixed top-20 right-4 z-50 w-72 bg-black/90 text-white backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500">Speech Tuning</h3>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Syllable Base */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Syllable Base</span>
            <span className="font-mono text-white">{tuning.sylBase.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={tuning.sylBase}
            onChange={(e) => handleChange("sylBase", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Syllable Step */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Syllable Step</span>
            <span className="font-mono text-white">{tuning.sylStep.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={tuning.sylStep}
            onChange={(e) => handleChange("sylStep", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Full Stop Pause */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Full Stop Pause</span>
            <span className="font-mono text-white">{tuning.pauseFull}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={tuning.pauseFull}
            onChange={(e) => handleChange("pauseFull", parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Comma Pause */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Comma Pause</span>
            <span className="font-mono text-white">{tuning.pauseComma}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={tuning.pauseComma}
            onChange={(e) => handleChange("pauseComma", parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Hyphen Pause */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Hyphen Pause</span>
            <span className="font-mono text-white">{tuning.pauseHyphen}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={tuning.pauseHyphen}
            onChange={(e) => handleChange("pauseHyphen", parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Prosody Intensity */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Prosody Intensity</span>
            <span className="font-mono text-white">{(tuning.prosodyIntensity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={tuning.prosodyIntensity}
            onChange={(e) => handleChange("prosodyIntensity", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 text-[9px] text-zinc-500 italic leading-relaxed">
        Adjust these values in real-time to find the perfect natural speech cadence.
      </div>
    </div>
  );
}
