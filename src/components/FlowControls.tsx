"use client";

import { Play, Pause, FastForward, Rewind, X, Plus, Minus } from "lucide-react";
import { useRef } from "react";

interface FlowControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  wpm: number;
  onWpmChange: (val: number) => void;
  onSkip: (direction: 'forward' | 'backward') => void;
  onReset?: () => void;
  onClose: () => void;
}

export default function FlowControls({ 
  isPlaying, 
  onTogglePlay, 
  wpm, 
  onWpmChange, 
  onSkip, 
  onReset,
  onClose 
}: FlowControlsProps) {
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const adjustWpm = (delta: number) => {
    const newWpm = Math.min(500, Math.max(50, wpm + delta));
    onWpmChange(newWpm);
  };

  const handleBackMouseDown = () => {
    holdTimerRef.current = setTimeout(() => {
      if (onReset) onReset();
    }, 1000);
  };

  const handleBackMouseUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  return (
    <div className="flex items-center justify-between bg-[var(--surface)] backdrop-blur-xl px-6 py-2 rounded-2xl border border-[var(--surface-border)] shadow-2xl w-full mx-auto pointer-events-auto transition-all animate-in slide-in-from-bottom-4">
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
          onMouseDown={handleBackMouseDown}
          onMouseUp={handleBackMouseUp}
          onMouseLeave={handleBackMouseUp}
          onTouchStart={handleBackMouseDown}
          onTouchEnd={handleBackMouseUp}
          className="p-2 text-white hover:text-orange-500 transition-colors"
        >
          <Rewind size={20} />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-10 h-10 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
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
          className="p-1.5 text-white hover:text-orange-500 transition-colors"
        >
          <Minus size={14} />
        </button>
        
        <div className="flex flex-col items-center min-w-[32px]">
          <span className="text-[10px] font-bold text-white tabular-nums">{wpm}</span>
        </div>

        <button
          onClick={() => adjustWpm(50)}
          className="p-1.5 text-white hover:text-orange-500 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
