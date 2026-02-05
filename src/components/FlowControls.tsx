"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, FastForward, Rewind } from "lucide-react";

interface FlowControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  wpm: number;
  onWpmChange: (val: number) => void;
  onSkip: (direction: 'forward' | 'backward') => void;
  onReset: () => void;
}

export default function FlowControls({ 
  isPlaying, 
  onTogglePlay, 
  wpm, 
  onWpmChange, 
  onSkip, 
  onReset 
}: FlowControlsProps) {
  return (
    <div className="flex flex-col gap-6 items-center bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-xl w-full max-w-md mx-auto">
      <div className="flex items-center gap-8">
        <button
          onClick={() => onSkip('backward')}
          className="p-3 text-zinc-400 hover:text-white transition-colors"
        >
          <Rewind size={24} />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-16 h-16 flex items-center justify-center bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>

        <button
          onClick={() => onSkip('forward')}
          className="p-3 text-zinc-400 hover:text-white transition-colors"
        >
          <FastForward size={24} />
        </button>
      </div>

      <div className="w-full space-y-3">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <span>Speed</span>
          <span>{wpm} WPM</span>
        </div>
        <input
          type="range"
          min="60"
          max="300"
          step="10"
          value={wpm}
          onChange={(e) => onWpmChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
        <div className="flex justify-between px-1">
          {[60, 120, 180, 240, 300].map((speed) => (
            <button
              key={speed}
              onClick={() => onWpmChange(speed)}
              className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors ${
                wpm === speed ? "bg-orange-500/20 text-orange-500" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {speed === 60 ? "Slow" : speed === 180 ? "Fast" : speed === 300 ? "Turbo" : speed}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        Reset Flow
      </button>
    </div>
  );
}

