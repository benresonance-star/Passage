"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChunkAudioRef } from "@/types";
import { Music4, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useChunkAudio } from "./useChunkAudio";

interface MinimalAudioPlayerProps {
  tracks: ChunkAudioRef[];
  className?: string;
}

const AUTO_COLLAPSE_MS = 3000;

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--:--";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function MinimalAudioPlayer({
  tracks,
  className = "",
}: MinimalAudioPlayerProps) {
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    currentTrack,
    currentTrackIndex,
    hasMultipleTracks,
    status,
    duration,
    progress,
    error,
    togglePlayback,
    nextTrack,
    previousTrack,
  } = useChunkAudio(tracks);

  if (!currentTrack) {
    return null;
  }

  const isPlaying = status === "playing";
  const showLoadingState = status === "loading";
  const collapsedOpacity = isPlaying ? 0.24 : 0.12;

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const scheduleCollapse = useCallback(() => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, AUTO_COLLAPSE_MS);
  }, [clearCollapseTimer]);

  const expandPlayer = useCallback(() => {
    setIsExpanded(true);
    scheduleCollapse();
  }, [scheduleCollapse]);

  const handleExpandedInteraction = useCallback(() => {
    if (!isExpanded) {
      return;
    }
    scheduleCollapse();
  }, [isExpanded, scheduleCollapse]);

  useEffect(() => {
    return () => {
      clearCollapseTimer();
    };
  }, [clearCollapseTimer]);

  return (
    <div
      className={`relative h-12 text-white ${className}`}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onPointerDown={handleExpandedInteraction}
      data-testid="soak-audio-player"
    >
      <div
        className={`absolute inset-0 overflow-hidden rounded-full border shadow-xl backdrop-blur-md transition-all duration-500 ease-in-out ${
          isExpanded
            ? "w-[min(92vw,28rem)] border-white/10 bg-black/35"
            : "w-12 border-transparent bg-transparent"
        }`}
        style={{
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <button
          type="button"
          onClick={() => expandPlayer()}
          className="absolute inset-0 flex items-center justify-center rounded-full transition-all duration-500 ease-in-out"
          style={{
            opacity: isExpanded ? 0 : collapsedOpacity,
            transform: isExpanded ? "scale(0.85)" : "scale(1)",
            backgroundColor: isExpanded ? "rgba(255, 252, 240, 0)" : "transparent",
            pointerEvents: isExpanded ? "none" : "auto",
          }}
          aria-label="Show audio controls"
          aria-expanded={isExpanded}
          data-testid="soak-audio-toggle"
        >
          <Music4 size={22} style={{ color: "#ffffff" }} />
        </button>

        <div
          className={`absolute inset-0 flex items-center gap-2 px-3 py-2 transition-all duration-500 ease-in-out ${
            isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          {hasMultipleTracks && (
            <button
              type="button"
              onClick={() => {
                handleExpandedInteraction();
                void previousTrack();
              }}
              className="rounded-full p-2 text-white/65 transition hover:text-white active:scale-95"
              aria-label="Previous audio track"
            >
              <SkipBack size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handleExpandedInteraction();
              void togglePlayback();
            }}
            className="rounded-full border border-white/10 bg-white/10 p-3 text-white transition hover:bg-white/15 active:scale-95"
            aria-label={isPlaying ? "Pause audio track" : "Play audio track"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium tracking-[0.16em] uppercase text-white/70">
              {currentTrack.title}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-[12px] text-white/90">
                {showLoadingState ? "Loading..." : currentTrack.source || "Music"}
              </div>
              <div className="shrink-0 text-[11px] text-white/45">
                {hasMultipleTracks ? `${currentTrackIndex + 1}/${tracks.length}` : formatDuration(duration)}
              </div>
            </div>
            <div className="mt-2 h-px overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-white/40 transition-[width] duration-300"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
            {error ? (
              <div className="mt-2 text-[11px] text-amber-200/80">{error}</div>
            ) : null}
          </div>

          {hasMultipleTracks && (
            <button
              type="button"
              onClick={() => {
                handleExpandedInteraction();
                void nextTrack();
              }}
              className="rounded-full p-2 text-white/65 transition hover:text-white active:scale-95"
              aria-label="Next audio track"
            >
              <SkipForward size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
