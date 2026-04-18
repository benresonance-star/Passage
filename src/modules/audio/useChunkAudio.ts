import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChunkAudioRef } from "@/types";
import type { ChunkAudioController, ChunkAudioStatus } from "./types";
import { resolveTrackUrl } from "./resolveTrackUrl";

function teardownAudio(audio: HTMLAudioElement | null): void {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

export function useChunkAudio(tracks: ChunkAudioRef[]): ChunkAudioController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolvedTrackIdRef = useRef<string | null>(null);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [status, setStatus] = useState<ChunkAudioStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const effectiveTrackIndex = currentTrackIndex < tracks.length ? currentTrackIndex : 0;
  const currentTrack = tracks[effectiveTrackIndex] ?? null;
  const hasMultipleTracks = tracks.length > 1;

  const ensureAudio = useCallback(() => {
    if (audioRef.current) {
      return audioRef.current;
    }

    const audio = new Audio();
    audio.preload = "none";

    audio.addEventListener("play", () => setStatus("playing"));
    audio.addEventListener("pause", () => {
      setStatus((prev) => (prev === "loading" ? prev : "paused"));
    });
    audio.addEventListener("ended", () => {
      setStatus("paused");
      setCurrentTime(audio.duration || 0);
    });
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime || 0);
    });
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration || 0);
    });
    audio.addEventListener("error", () => {
      setStatus("error");
      setError("Audio could not be loaded.");
    });

    audioRef.current = audio;
    return audio;
  }, []);

  const loadTrack = useCallback(
    (track: ChunkAudioRef, audio: HTMLAudioElement) => {
      if (resolvedTrackIdRef.current === track.id && audio.src) {
        return;
      }

      const nextUrl = resolveTrackUrl(track);
      audio.preload = "auto";
      audio.src = nextUrl;
      audio.load();
      resolvedTrackIdRef.current = track.id;
      setDuration(0);
      setCurrentTime(0);
    },
    [],
  );

  const playIndex = useCallback(
    async (index: number) => {
      const track = tracks[index];
      if (!track) {
        return;
      }

      const audio = ensureAudio();
      setError(null);
      setStatus("loading");

      try {
        loadTrack(track, audio);
        if (audio.ended || audio.currentTime >= (audio.duration || 0)) {
          audio.currentTime = 0;
        }
        await audio.play();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Audio playback failed.");
      }
    },
    [ensureAudio, loadTrack, tracks],
  );

  const selectTrack = useCallback(
    async (index: number) => {
      if (index < 0 || index >= tracks.length) {
        return;
      }

      const shouldAutoplay = status === "playing" || status === "loading";
      const audio = audioRef.current;

      setCurrentTrackIndex(index);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      resolvedTrackIdRef.current = null;

      if (audio) {
        teardownAudio(audio);
      }

      if (shouldAutoplay) {
        await playIndex(index);
      } else {
        setStatus("idle");
      }
    },
    [playIndex, status, tracks.length],
  );

  const play = useCallback(async () => {
    if (effectiveTrackIndex >= tracks.length) {
      return;
    }

    await playIndex(effectiveTrackIndex);
  }, [effectiveTrackIndex, playIndex, tracks.length]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayback = useCallback(async () => {
    if (status === "playing") {
      pause();
      return;
    }

    await play();
  }, [pause, play, status]);

  const nextTrack = useCallback(async () => {
    if (!hasMultipleTracks) {
      return;
    }

    await selectTrack((effectiveTrackIndex + 1) % tracks.length);
  }, [effectiveTrackIndex, hasMultipleTracks, selectTrack, tracks.length]);

  const previousTrack = useCallback(async () => {
    if (!hasMultipleTracks) {
      return;
    }

    const nextIndex =
      effectiveTrackIndex === 0 ? tracks.length - 1 : effectiveTrackIndex - 1;
    await selectTrack(nextIndex);
  }, [effectiveTrackIndex, hasMultipleTracks, selectTrack, tracks.length]);

  useEffect(() => {
    if (tracks.length === 0) {
      teardownAudio(audioRef.current);
      resolvedTrackIdRef.current = null;
      return;
    }

    if (currentTrackIndex >= tracks.length) {
      resolvedTrackIdRef.current = null;
      teardownAudio(audioRef.current);
    }
  }, [currentTrackIndex, tracks]);

  useEffect(() => {
    return () => {
      teardownAudio(audioRef.current);
      audioRef.current = null;
      resolvedTrackIdRef.current = null;
    };
  }, []);

  return useMemo(
    () => ({
      tracks,
      currentTrack,
      currentTrackIndex: effectiveTrackIndex,
      hasMultipleTracks,
      status,
      currentTime,
      duration,
      progress: duration > 0 ? currentTime / duration : 0,
      error,
      play,
      pause,
      togglePlayback,
      nextTrack,
      previousTrack,
      selectTrack,
    }),
    [
      currentTime,
      currentTrack,
      duration,
      effectiveTrackIndex,
      error,
      hasMultipleTracks,
      nextTrack,
      pause,
      play,
      previousTrack,
      selectTrack,
      status,
      togglePlayback,
      tracks,
    ],
  );
}
