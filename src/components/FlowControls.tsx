"use client";

import { Play, Pause, FastForward, Rewind, X, Plus, Minus } from "lucide-react";

interface FlowControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  wpm: number;
  onWpmChange: (val: number) => void;
  onSkip: (direction: 'forward' | 'backward') => void;
  onClose: () => void;
}

export default function FlowControls({ 
  isPlaying, 
  onTogglePlay, 
  wpm, 
  onWpmChange, 
  onSkip, 
  onClose 
}: FlowControlsProps) {
  const adjustWpm = (delta: number) => {
    const newWpm = Math.min(500, Math.max(50, wpm + delta));
    onWpmChange(newWpm);
  };

  return (
    <div className="flex items-center justify-between bg-[var(--surface)] backdrop-blur-xl px-6 py-4 rounded-full border border-[var(--surface-border)] shadow-2xl w-[92%] max-w-md mx-auto pointer-events-auto transition-all animate-in slide-in-from-bottom-4">
      {/* Exit Button */}
      <button
        onClick={onClose}
        className="p-2 text-zinc-500 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSkip('backward')}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <Rewind size={20} />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-12 h-12 flex items-center justify-center bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>

        <button
          onClick={() => onSkip('forward')}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <FastForward size={20} />
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => adjustWpm(-50)}
          className="p-1.5 text-zinc-500 hover:text-white transition-colors bg-[var(--surface-alt)] rounded-lg"
        >
          <Minus size={14} />
        </button>
        
        <div className="flex flex-col items-center min-w-[40px]">
          <span className="text-[14px] font-bold text-white tabular-nums">{wpm}</span>
        </div>

        <button
          onClick={() => adjustWpm(50)}
          className="p-1.5 text-zinc-500 hover:text-white transition-colors bg-[var(--surface-alt)] rounded-lg"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
