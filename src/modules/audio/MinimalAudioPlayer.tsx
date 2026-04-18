"use client";

import type { ChunkAudioRef } from "@/types";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useChunkAudio } from "./useChunkAudio";

interface MinimalAudioPlayerProps {
  tracks: ChunkAudioRef[];
  className?: string;
}

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

  return (
    <div
      className={`w-[min(92vw,28rem)] rounded-full border border-white/10 bg-black/35 px-3 py-2 text-white shadow-xl backdrop-blur-md ${className}`}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      data-testid="soak-audio-player"
    >
      <div className="flex items-center gap-2">
        {hasMultipleTracks && (
          <button
            type="button"
            onClick={() => void previousTrack()}
            className="rounded-full p-2 text-white/65 transition hover:text-white active:scale-95"
            aria-label="Previous audio track"
          >
            <SkipBack size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={() => void togglePlayback()}
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
            onClick={() => void nextTrack()}
            className="rounded-full p-2 text-white/65 transition hover:text-white active:scale-95"
            aria-label="Next audio track"
          >
            <SkipForward size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
