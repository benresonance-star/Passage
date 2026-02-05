"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, FastForward, Rewind } from "lucide-react";

interface FlowReaderProps {
  text: string;
  onComplete?: () => void;
}

export default function FlowReader({ text, onComplete }: FlowReaderProps) {
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(120);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWords(text.split(/\s+/).filter(w => w.length > 0));
  }, [text]);

  useEffect(() => {
    if (isPlaying && currentIndex < words.length - 1) {
      const msPerWord = (60 / wpm) * 1000;
      timerRef.current = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, msPerWord);
    } else if (currentIndex >= words.length - 1) {
      setIsPlaying(false);
      if (onComplete) onComplete();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, words.length, wpm, onComplete]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const reset = () => {
    setIsPlaying(false);
    setCurrentIndex(-1);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      {/* Word Display Area - Matches Practice Mode Exactly */}
      <div 
        ref={containerRef}
        className="relative min-h-[200px] p-6 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 overflow-hidden"
      >
        {/* Base Layer: Dimmed Text */}
        <div className="chunk-text-bold text-center leading-relaxed text-zinc-800 select-none">
          {words.map((word, index) => (
            <span 
              key={index} 
              onClick={() => {
                setCurrentIndex(index);
                if (!isPlaying) setIsPlaying(true);
              }}
              className="cursor-pointer transition-colors hover:text-zinc-600"
            >
              {word}{" "}
            </span>
          ))}
        </div>

        {/* Highlight Layer: Only the active word is opaque and orange */}
        <div 
          className="absolute inset-0 p-6 chunk-text-bold text-center leading-relaxed pointer-events-none select-none"
          aria-hidden="true"
        >
          {words.map((word, index) => (
            <motion.span
              key={index}
              initial={false}
              animate={{
                opacity: index === currentIndex ? 1 : 0,
                color: index === currentIndex ? "#f97316" : "transparent",
              }}
              transition={{
                duration: 0.15,
                ease: "linear"
              }}
            >
              {word}{" "}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-6 items-center bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setCurrentIndex(Math.max(-1, currentIndex - 5))}
            className="p-3 text-zinc-400 hover:text-white transition-colors"
          >
            <Rewind size={24} />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 flex items-center justify-center bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>

          <button
            onClick={() => setCurrentIndex(Math.min(words.length - 1, currentIndex + 5))}
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
            onChange={(e) => setWpm(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between px-1">
            {[60, 120, 180, 240, 300].map((speed) => (
              <button
                key={speed}
                onClick={() => setWpm(speed)}
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
          onClick={reset}
          className="text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Reset Flow
        </button>
      </div>
    </div>
  );
}
