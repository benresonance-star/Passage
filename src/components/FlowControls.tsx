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
    <div className="flex items-center justify-between bg-[var(--surface)] backdrop-blur-xl px-6 py-4 rounded-2xl border border-[var(--surface-border)] shadow-2xl w-full mx-auto pointer-events-auto transition-all animate-in slide-in-from-bottom-4">
      {/* Exit Button */}
      <button
        onClick={onClose}
        className="p-2 text-white hover:text-orange-500 transition-colors"
      >
        <X size={20} />
      </button>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSkip('backward')}
          className="p-2 text-white hover:text-orange-500 transition-colors"
        >
          <Rewind size={20} />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-12 h-12 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
        </button>

        <button
          onClick={() => onSkip('forward')}
          className="p-2 text-white hover:text-orange-500 transition-colors"
        >
          <FastForward size={20} />
        </button>
      </div>

      {/* Speed Controls Container */}
      <div className="flex items-center bg-[var(--surface-alt)] rounded-xl border border-[var(--surface-border)] px-1">
        <button
          onClick={() => adjustWpm(-50)}
          className="p-2 text-white hover:text-orange-500 transition-colors"
        >
          <Minus size={16} />
        </button>
        
        <div className="flex flex-col items-center min-w-[36px]">
          <span className="text-xs font-bold text-white tabular-nums">{wpm}</span>
        </div>

        <button
          onClick={() => adjustWpm(50)}
          className="p-2 text-white hover:text-orange-500 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
